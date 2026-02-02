import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../core/services/location_service.dart';
import 'location_event.dart';
import 'location_state.dart';

/// BLoC for managing location tracking state and events
class LocationBloc extends Bloc<LocationEvent, LocationState> {
  LocationBloc({
    required LocationService locationService,
    Logger? logger,
  })  : _locationService = locationService,
        _logger = logger ?? Logger(),
        super(const LocationInitial()) {
    on<StartTracking>(_onStartTracking);
    on<StopTracking>(_onStopTracking);
    on<LocationUpdated>(_onLocationUpdated);
    on<LocationError>(_onLocationError);
    on<CheckPermissions>(_onCheckPermissions);
    on<GetCurrentPosition>(_onGetCurrentPosition);
    on<SyncPendingLocations>(_onSyncPendingLocations);
    on<RefreshStatus>(_onRefreshStatus);
  }

  final LocationService _locationService;
  final Logger _logger;

  /// Handle start tracking event
  Future<void> _onStartTracking(
    StartTracking event,
    Emitter<LocationState> emit,
  ) async {
    try {
      _logger.i('Starting tracking for driver: ${event.driverId}');

      emit(const LocationPermissionChecking());

      final success = await _locationService.startTracking(event.driverId);

      if (success) {
        _logger.i('Tracking started successfully');
        emit(LocationTracking(driverId: event.driverId));
      } else {
        _logger.w('Failed to start tracking - checking permissions');
        final hasPermission = await _locationService.checkPermissions();

        if (!hasPermission) {
          emit(const LocationPermissionDenied());
        } else {
          emit(const LocationErrorState(
            message: 'Failed to start location tracking. Please try again.',
          ));
        }
      }
    } catch (e) {
      _logger.e('Error starting tracking: $e');
      emit(LocationErrorState(
        message: 'Error starting tracking: $e',
      ));
    }
  }

  /// Handle stop tracking event
  Future<void> _onStopTracking(
    StopTracking event,
    Emitter<LocationState> emit,
  ) async {
    try {
      _logger.i('Stopping tracking');
      await _locationService.stopTracking();

      final pendingCount = _locationService.pendingLocationCount;
      emit(LocationStopped(pendingSyncCount: pendingCount));
    } catch (e) {
      _logger.e('Error stopping tracking: $e');
      emit(LocationErrorState(
        message: 'Error stopping tracking: $e',
      ));
    }
  }

  /// Handle location updated event
  Future<void> _onLocationUpdated(
    LocationUpdated event,
    Emitter<LocationState> emit,
  ) async {
    try {
      if (state is LocationTracking) {
        final currentState = state as LocationTracking;
        final pendingCount = _locationService.pendingLocationCount;

        emit(currentState.copyWith(
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy,
          speed: event.speed,
          heading: event.heading,
          pendingSyncCount: pendingCount,
          lastUpdateTime: DateTime.now(),
        ));

        _logger.d(
          'Location updated: ${event.latitude}, ${event.longitude}',
        );
      }
    } catch (e) {
      _logger.e('Error handling location update: $e');
    }
  }

  /// Handle location error event
  Future<void> _onLocationError(
    LocationError event,
    Emitter<LocationState> emit,
  ) async {
    _logger.e('Location error: ${event.message}');
    emit(LocationErrorState(
      message: event.message,
      canRetry: true,
    ));
  }

  /// Handle check permissions event
  Future<void> _onCheckPermissions(
    CheckPermissions event,
    Emitter<LocationState> emit,
  ) async {
    try {
      emit(const LocationPermissionChecking());

      final hasPermission = await _locationService.checkPermissions();

      if (hasPermission) {
        emit(const LocationPermissionGranted());
      } else {
        emit(const LocationPermissionDenied());
      }
    } catch (e) {
      _logger.e('Error checking permissions: $e');
      emit(LocationErrorState(
        message: 'Error checking permissions: $e',
      ));
    }
  }

  /// Handle get current position event
  Future<void> _onGetCurrentPosition(
    GetCurrentPosition event,
    Emitter<LocationState> emit,
  ) async {
    try {
      emit(const LocationPositionLoading());

      final position = await _locationService.getCurrentPosition();

      if (position != null) {
        emit(LocationPositionReceived(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
        ));
      } else {
        emit(const LocationErrorState(
          message: 'Could not get current position. Please check permissions.',
          canRetry: true,
        ));
      }
    } catch (e) {
      _logger.e('Error getting current position: $e');
      emit(LocationErrorState(
        message: 'Error getting position: $e',
      ));
    }
  }

  /// Handle sync pending locations event
  Future<void> _onSyncPendingLocations(
    SyncPendingLocations event,
    Emitter<LocationState> emit,
  ) async {
    try {
      final pendingCount = _locationService.pendingLocationCount;

      if (pendingCount == 0) {
        _logger.i('No pending locations to sync');
        return;
      }

      emit(LocationSyncing(pendingCount: pendingCount));
      _logger.i('Syncing $pendingCount pending locations');

      // The sync happens in the service - just refresh the state
      await _locationService.syncPendingLocations();

      final remainingCount = _locationService.pendingLocationCount;
      final syncedCount = pendingCount - remainingCount;

      emit(LocationSyncComplete(
        syncedCount: syncedCount,
        failedCount: remainingCount,
      ));

      // If we're in tracking state, update the pending count
      if (state is LocationTracking) {
        final currentState = state as LocationTracking;
        emit(currentState.copyWith(pendingSyncCount: remainingCount));
      }

      _logger.i('Sync complete: $syncedCount synced, $remainingCount failed');
    } catch (e) {
      _logger.e('Error syncing pending locations: $e');
      emit(LocationErrorState(
        message: 'Error syncing locations: $e',
      ));
    }
  }

  /// Handle refresh status event
  Future<void> _onRefreshStatus(
    RefreshStatus event,
    Emitter<LocationState> emit,
  ) async {
    try {
      final isTracking = _locationService.isTracking;
      final pendingCount = _locationService.pendingLocationCount;
      final driverId = _locationService.currentDriverId;

      if (isTracking && driverId != null) {
        // Get current position to refresh coordinates
        final position = await _locationService.getCurrentPosition();

        if (state is LocationTracking) {
          final currentState = state as LocationTracking;
          emit(currentState.copyWith(
            pendingSyncCount: pendingCount,
            latitude: position?.latitude ?? currentState.latitude,
            longitude: position?.longitude ?? currentState.longitude,
          ));
        } else {
          emit(LocationTracking(
            driverId: driverId,
            latitude: position?.latitude,
            longitude: position?.longitude,
            pendingSyncCount: pendingCount,
          ));
        }
      } else {
        emit(LocationStopped(pendingSyncCount: pendingCount));
      }
    } catch (e) {
      _logger.e('Error refreshing status: $e');
    }
  }
}
