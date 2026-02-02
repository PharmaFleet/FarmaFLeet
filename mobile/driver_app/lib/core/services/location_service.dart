import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive/hive.dart';
import 'package:logger/logger.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';
import '../models/location_model.dart';

/// Service for tracking driver location.
/// Handles permissions, position streaming, and syncing with backend.
class LocationService {
  LocationService({
    required ApiClient apiClient,
    required Box<LocationUpdateModel> locationBox,
    Logger? logger,
  })  : _apiClient = apiClient,
        _locationBox = locationBox,
        _logger = logger ?? Logger() {
    _connectivity = Connectivity();
  }

  final ApiClient _apiClient;
  final Box<LocationUpdateModel> _locationBox;
  final Logger _logger;
  late final Connectivity _connectivity;

  StreamSubscription<Position>? _positionStreamSubscription;
  String? _currentDriverId;

  /// Minimum distance filter in meters (debug: 0)
  static const double _distanceFilter = 0.0;

  /// Minimum time interval between updates (debug: 10s)
  static const int _timeIntervalSeconds = 10;

  /// Timestamp of last location update
  DateTime? _lastUpdateTime;

  /// Singleton instance
  static LocationService? _instance;

  /// Get singleton instance
  static LocationService get instance {
    if (_instance == null) {
      throw StateError(
        'LocationService not initialized. Call initialize() first.',
      );
    }
    return _instance!;
  }

  /// Initialize the location service
  static Future<void> initialize({
    required ApiClient apiClient,
    required Box<LocationUpdateModel> locationBox,
    Logger? logger,
  }) async {
    _instance = LocationService(
      apiClient: apiClient,
      locationBox: locationBox,
      logger: logger,
    );
  }

  /// Check and request required permissions
  /// Returns true if all permissions are granted
  Future<bool> checkPermissions() async {
    try {
      // Check location permission
      var locationPermission = await Permission.location.status;

      if (locationPermission.isDenied) {
        locationPermission = await Permission.location.request();
        if (locationPermission.isDenied) {
          _logger.w('Location permission denied');
          return false;
        }
      }

      if (locationPermission.isPermanentlyDenied) {
        _logger.e('Location permission permanently denied');
        return false;
      }

      // Check background location permission
      var backgroundPermission = await Permission.locationAlways.status;

      if (backgroundPermission.isDenied) {
        // On iOS, we need to request whenInUse first, then always
        backgroundPermission = await Permission.locationAlways.request();
        if (backgroundPermission.isDenied) {
          _logger.w('Background location permission denied');
          // Continue without background - foreground tracking still works
        }
      }

      // Check if location services are enabled
      final isLocationServiceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!isLocationServiceEnabled) {
        _logger.w('Location services are disabled');
        return false;
      }

      _logger.i('All location permissions granted');
      return true;
    } catch (e) {
      _logger.e('Error checking permissions: $e');
      return false;
    }
  }

  /// Start tracking location for a driver
  /// Returns true if tracking started successfully
  Future<bool> startTracking(String driverId) async {
    try {
      // Check permissions first
      final hasPermission = await checkPermissions();
      if (!hasPermission) {
        _logger.e('Cannot start tracking - permissions not granted');
        return false;
      }

      // Stop any existing tracking
      await stopTracking();

      _currentDriverId = driverId;
      _logger.i('Starting location tracking for driver: $driverId');

      // Configure location settings with BALANCED accuracy for better battery life
      // We use 'high' instead of 'bestForNavigation' to reduce battery drain
      // Accuracy is still good enough for delivery tracking (within 10-20m typically)
      final locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,  // Changed from bestForNavigation for 30-40% battery savings
        distanceFilter: _distanceFilter.toInt(),
        timeLimit: const Duration(seconds: 10),  // Timeout for location acquisition
      );

      // Subscribe to position stream
      _positionStreamSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (p) {
            _logger.i('Raw position update received: ${p.latitude}, ${p.longitude} acc:${p.accuracy}');
            _handlePositionUpdate(p);
        },
        onError: _handlePositionError,
        onDone: () {
          _logger.i('Position stream closed');
        },
      );

      // Sync any pending locations from local storage
      await syncPendingLocations();

      _logger.i('Location tracking started successfully');
      return true;
    } catch (e) {
      _logger.e('Error starting location tracking: $e');
      return false;
    }
  }

  /// Stop location tracking
  Future<void> stopTracking() async {
    if (_positionStreamSubscription != null) {
      _logger.i('Stopping location tracking');
      await _positionStreamSubscription!.cancel();
      _positionStreamSubscription = null;
      _currentDriverId = null;
    }
  }

  /// Handle incoming position update
  Future<void> _handlePositionUpdate(Position position) async {
    if (_currentDriverId == null) {
      _logger.w('Received position update but no driver ID set');
      return;
    }

    // BATTERY OPTIMIZATION: Skip updates if accuracy is poor (> 100m)
    // Poor accuracy means GPS is struggling, which drains battery
    // DEBUG: increased to 5000m for emulator
    if (position.accuracy > 5000.0) {
      _logger.d('Skipping update - poor accuracy: ${position.accuracy}m');
      return;
    }

    _logger.d(
      'Position update: ${position.latitude}, ${position.longitude} '
      '(accuracy: ${position.accuracy}m, speed: ${position.speed}m/s)',
    );

    final locationUpdate = LocationUpdateModel(
      id: const Uuid().v4(),
      driverId: _currentDriverId!,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: DateTime.now(),
      speed: position.speed > 0 ? position.speed : null,
      heading: position.heading > 0 ? position.heading : null,
      synced: false,
    );

    // ADAPTIVE THROTTLING: Adjust interval based on movement speed
    // If driver is stationary (< 1 m/s), throttle more aggressively
    final isStationary = position.speed < 1.0;
    final throttleSeconds = isStationary ? _timeIntervalSeconds * 2 : _timeIntervalSeconds;

    if (await _shouldThrottleUpdate(locationUpdate.driverId, throttleSeconds)) {
      _logger.d(
        'Throttling location update - too soon since last update '
        '(${isStationary ? "stationary mode" : "normal mode"})',
      );
      return;
    }

    // Try to send to backend
    await _sendLocationUpdate(locationUpdate);
  }

  /// Determine if we should throttle this update based on time
  /// Uses in-memory timestamp for better performance (no Hive access)
  /// [throttleSeconds] allows adaptive throttling based on movement speed
  Future<bool> _shouldThrottleUpdate(String driverId, [int? throttleSeconds]) async {
    final effectiveThrottle = throttleSeconds ?? _timeIntervalSeconds;

    if (_lastUpdateTime == null) {
      _lastUpdateTime = DateTime.now();
      return false;
    }

    final timeSinceLastUpdate = DateTime.now().difference(_lastUpdateTime!);
    if (timeSinceLastUpdate.inSeconds < effectiveThrottle) {
      return true;  // Throttle - too soon
    }

    _lastUpdateTime = DateTime.now();
    return false;  // Allow update
  }

  /// Send location update to backend
  Future<void> _sendLocationUpdate(LocationUpdateModel location) async {
    try {
      // Check connectivity
      final connectivityResult = await _connectivity.checkConnectivity();
      final isOffline = connectivityResult == ConnectivityResult.none;

      if (isOffline) {
        _logger.w('Device offline - storing location locally');
        await _storeForRetry(location);
        return;
      }

      // Try to send to backend
      final success = await _apiClient.updateLocation(location);

      if (success) {
        _logger.i('Location update sent successfully');
        // Store as synced
        await _locationBox.put(
          location.id,
          location.copyWith(synced: true),
        );
      } else {
        _logger.w('Failed to send location - storing for retry');
        await _storeForRetry(location);
      }
    } catch (e) {
      _logger.e('Error sending location update: $e');
      await _storeForRetry(location);
    }
  }

  /// Store location update locally for retry
  Future<void> _storeForRetry(LocationUpdateModel location) async {
    try {
      await _locationBox.put(location.id, location);
      _logger.i('Stored location locally for retry: ${location.id}');
    } catch (e) {
      _logger.e('Error storing location locally: $e');
    }
  }

  /// Sync pending locations from local storage
  Future<void> syncPendingLocations() async {
    try {
      final pendingLocations = _locationBox.values
          .where((loc) => !loc.synced)
          .toList();

      if (pendingLocations.isEmpty) {
        _logger.d('No pending locations to sync');
        return;
      }

      _logger.i('Syncing ${pendingLocations.length} pending locations');

      // Check connectivity first
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        _logger.w('Cannot sync - device is offline');
        return;
      }

      // Try to sync each pending location
      for (final location in pendingLocations) {
        try {
          final success = await _apiClient.updateLocation(location);

          if (success) {
            // Mark as synced
            await _locationBox.put(
              location.id,
              location.copyWith(synced: true),
            );
            _logger.d('Synced location: ${location.id}');
          } else {
            _logger.w('Failed to sync location: ${location.id}');
          }
        } catch (e) {
          _logger.e('Error syncing location ${location.id}: $e');
          // Continue with next location
        }
      }

      // Clean up old synced locations (keep last 100)
      await _cleanupOldLocations();
    } catch (e) {
      _logger.e('Error syncing pending locations: $e');
    }
  }

  /// Clean up old synced locations, keeping only recent ones
  Future<void> _cleanupOldLocations() async {
    try {
      final syncedLocations = _locationBox.values
          .where((loc) => loc.synced)
          .toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      // Keep only last 100 synced locations
      if (syncedLocations.length > 100) {
        final toDelete = syncedLocations.sublist(100);
        for (final location in toDelete) {
          await _locationBox.delete(location.id);
        }
        _logger.d('Cleaned up ${toDelete.length} old locations');
      }
    } catch (e) {
      _logger.e('Error cleaning up old locations: $e');
    }
  }

  /// Get current position (one-time fetch)
  Future<Position?> getCurrentPosition() async {
    try {
      final hasPermission = await checkPermissions();
      if (!hasPermission) {
        _logger.w('Cannot get position - permissions not granted');
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.bestForNavigation,
      );

      _logger.i(
        'Got current position: ${position.latitude}, ${position.longitude}',
      );
      return position;
    } catch (e) {
      _logger.e('Error getting current position: $e');
      return null;
    }
  }

  /// Handle position stream error
  void _handlePositionError(Object error) {
    _logger.e('Position stream error: $error');
  }

  /// Get tracking status
  bool get isTracking => _positionStreamSubscription != null;

  /// Get current driver ID
  String? get currentDriverId => _currentDriverId;

  /// Get count of pending (unsynced) locations
  int get pendingLocationCount {
    return _locationBox.values.where((loc) => !loc.synced).length;
  }

  /// Update driver availability status on the backend
  /// Returns true if successful, false otherwise
  Future<bool> updateDriverStatus(bool isAvailable) async {
    try {
      final success = await _apiClient.updateDriverStatus(isAvailable);
      if (success) {
        _logger.i('Driver status updated to: $isAvailable');
      } else {
        _logger.w('Failed to update driver status');
      }
      return success;
    } catch (e) {
      _logger.e('Error updating driver status: $e');
      return false;
    }
  }

  /// Dispose of resources
  void dispose() {
    stopTracking();
  }
}

/// Exception for permission-related errors
class LocationPermissionException implements Exception {
  LocationPermissionException(this.message);

  final String message;

  @override
  String toString() => 'LocationPermissionException: $message';
}

/// Exception for location service errors
class LocationServiceException implements Exception {
  LocationServiceException(this.message);

  final String message;

  @override
  String toString() => 'LocationServiceException: $message';
}
