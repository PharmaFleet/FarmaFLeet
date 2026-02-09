import 'dart:async';
import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/location_model.dart';

/// Background service for maintaining driver online status and location tracking
/// when the app is minimized.
class BackgroundServiceManager {
  static final BackgroundServiceManager _instance =
      BackgroundServiceManager._internal();
  factory BackgroundServiceManager() => _instance;
  BackgroundServiceManager._internal();

  final FlutterBackgroundService _service = FlutterBackgroundService();
  bool _isInitialized = false;

  /// Initialize the background service
  Future<void> initialize() async {
    if (_isInitialized) return;

    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'pharmafleet_driver_channel',
        initialNotificationTitle: 'PharmaFleet Active',
        initialNotificationContent: 'Tracking your location',
        foregroundServiceNotificationId: 888,
        foregroundServiceTypes: [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );

    _isInitialized = true;
    debugPrint('[BackgroundService] Initialized');
  }

  /// Start the background service
  Future<void> startService(String driverId) async {
    if (!_isInitialized) {
      await initialize();
    }

    // Pass driver ID to the service
    final isRunning = await _service.isRunning();
    if (!isRunning) {
      await _service.startService();
      debugPrint('[BackgroundService] Started for driver: $driverId');
    }

    // Send driver ID to the running service
    _service.invoke('setDriverId', {'driverId': driverId});
  }

  /// Stop the background service
  Future<void> stopService() async {
    final isRunning = await _service.isRunning();
    if (isRunning) {
      _service.invoke('stopService');
      debugPrint('[BackgroundService] Stopped');
    }
  }

  /// Check if service is running
  Future<bool> isRunning() async {
    return await _service.isRunning();
  }
}

/// Entry point for iOS background execution
@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  return true;
}

/// Entry point for background service
@pragma('vm:entry-point')
Future<void> onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  String? driverId;
  StreamSubscription<Position>? positionSubscription;
  DateTime? lastUpdateTime;
  Box<LocationUpdateModel>? locationBox;

  // Initialize Hive for background isolate
  try {
    await Hive.initFlutter();
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(LocationUpdateModelAdapter());
    }
    locationBox = await Hive.openBox<LocationUpdateModel>('location_updates');
    debugPrint('[BackgroundService] Hive initialized');
  } catch (e) {
    debugPrint('[BackgroundService] Hive init error: $e');
  }

  // Handle stop service request
  service.on('stopService').listen((event) async {
    debugPrint('[BackgroundService] Stopping...');
    await positionSubscription?.cancel();
    await service.stopSelf();
  });

  // Handle driver ID updates
  service.on('setDriverId').listen((event) {
    if (event != null && event['driverId'] != null) {
      driverId = event['driverId'] as String;
      debugPrint('[BackgroundService] Driver ID set: $driverId');

      // Start location tracking once we have driver ID
      _startLocationTracking(
        service,
        driverId!,
        locationBox,
        positionSubscription,
        lastUpdateTime,
      );
    }
  });

  // Update notification periodically
  Timer.periodic(const Duration(minutes: 1), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: 'PharmaFleet Active',
          content: 'You are online and receiving orders',
        );
      }
    }
  });
}

/// Start location tracking in background
Future<void> _startLocationTracking(
  ServiceInstance service,
  String driverId,
  Box<LocationUpdateModel>? locationBox,
  StreamSubscription<Position>? existingSubscription,
  DateTime? lastUpdateTime,
) async {
  // Cancel existing subscription if any
  await existingSubscription?.cancel();

  const locationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 50, // Only update when moved 50 meters
  );

  final positionStream = Geolocator.getPositionStream(
    locationSettings: locationSettings,
  );

  positionStream.listen(
    (Position position) async {
      // Throttle updates to every 30 seconds in background
      final now = DateTime.now();
      if (lastUpdateTime != null &&
          now.difference(lastUpdateTime!).inSeconds < 30) {
        return;
      }
      lastUpdateTime = now;

      debugPrint(
        '[BackgroundService] Location: ${position.latitude}, ${position.longitude}',
      );

      // Store location in Hive for later sync
      if (locationBox != null) {
        try {
          final locationUpdate = LocationUpdateModel(
            id: const Uuid().v4(),
            driverId: driverId,
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            timestamp: DateTime.now(),
            speed: position.speed > 0 ? position.speed : null,
            heading: position.heading > 0 ? position.heading : null,
            synced: false,
          );

          await locationBox.put(locationUpdate.id, locationUpdate);
          debugPrint('[BackgroundService] Location stored for sync');
        } catch (e) {
          debugPrint('[BackgroundService] Error storing location: $e');
        }
      }
    },
    onError: (error) {
      debugPrint('[BackgroundService] Location error: $error');
    },
  );
}

/// Global function to initialize background service
Future<void> initializeBackgroundService() async {
  await BackgroundServiceManager().initialize();
}

/// Global function to start background service
Future<void> startBackgroundService(String driverId) async {
  await BackgroundServiceManager().startService(driverId);
}

/// Global function to stop background service
Future<void> stopBackgroundService() async {
  await BackgroundServiceManager().stopService();
}
