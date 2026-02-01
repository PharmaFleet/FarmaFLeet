import 'package:equatable/equatable.dart';

/// Base class for all location events
abstract class LocationEvent extends Equatable {
  const LocationEvent();

  @override
  List<Object?> get props => [];
}

/// Event to start location tracking
class StartTracking extends LocationEvent {
  const StartTracking({required this.driverId});

  final String driverId;

  @override
  List<Object?> get props => [driverId];
}

/// Event to stop location tracking
class StopTracking extends LocationEvent {
  const StopTracking();
}

/// Event when a new location update is received
class LocationUpdated extends LocationEvent {
  const LocationUpdated({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.speed,
    this.heading,
  });

  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? speed;
  final double? heading;

  @override
  List<Object?> get props => [latitude, longitude, accuracy, speed, heading];
}

/// Event when an error occurs during tracking
class LocationError extends LocationEvent {
  const LocationError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

/// Event to check permissions
class CheckPermissions extends LocationEvent {
  const CheckPermissions();
}

/// Event to get current position (one-time)
class GetCurrentPosition extends LocationEvent {
  const GetCurrentPosition();
}

/// Event to sync pending locations
class SyncPendingLocations extends LocationEvent {
  const SyncPendingLocations();
}

/// Event to refresh tracking status
class RefreshStatus extends LocationEvent {
  const RefreshStatus();
}
