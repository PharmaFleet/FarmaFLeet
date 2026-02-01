import 'package:equatable/equatable.dart';

/// Base class for all location states
abstract class LocationState extends Equatable {
  const LocationState();

  @override
  List<Object?> get props => [];
}

/// Initial state when location tracking is not started
class LocationInitial extends LocationState {
  const LocationInitial();
}

/// State when permissions are being checked
class LocationPermissionChecking extends LocationState {
  const LocationPermissionChecking();
}

/// State when permissions are granted
class LocationPermissionGranted extends LocationState {
  const LocationPermissionGranted();
}

/// State when permissions are denied
class LocationPermissionDenied extends LocationState {
  const LocationPermissionDenied({this.isPermanentlyDenied = false});

  final bool isPermanentlyDenied;

  @override
  List<Object?> get props => [isPermanentlyDenied];
}

/// State when location tracking is active
class LocationTracking extends LocationState {
  const LocationTracking({
    required this.driverId,
    this.latitude,
    this.longitude,
    this.accuracy,
    this.speed,
    this.heading,
    this.pendingSyncCount = 0,
    this.lastUpdateTime,
  });

  final String driverId;
  final double? latitude;
  final double? longitude;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final int pendingSyncCount;
  final DateTime? lastUpdateTime;

  LocationTracking copyWith({
    String? driverId,
    double? latitude,
    double? longitude,
    double? accuracy,
    double? speed,
    double? heading,
    int? pendingSyncCount,
    DateTime? lastUpdateTime,
  }) {
    return LocationTracking(
      driverId: driverId ?? this.driverId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      speed: speed ?? this.speed,
      heading: heading ?? this.heading,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      lastUpdateTime: lastUpdateTime ?? this.lastUpdateTime,
    );
  }

  @override
  List<Object?> get props => [
        driverId,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        pendingSyncCount,
        lastUpdateTime,
      ];

  @override
  String toString() {
    return 'LocationTracking(driverId: $driverId, lat: $latitude, lng: $longitude, pending: $pendingSyncCount)';
  }
}

/// State when location tracking is stopped
class LocationStopped extends LocationState {
  const LocationStopped({this.pendingSyncCount = 0});

  final int pendingSyncCount;

  @override
  List<Object?> get props => [pendingSyncCount];
}

/// State when there's an error with location tracking
class LocationErrorState extends LocationState {
  const LocationErrorState({
    required this.message,
    this.canRetry = true,
  });

  final String message;
  final bool canRetry;

  @override
  List<Object?> get props => [message, canRetry];
}

/// State when getting current position
class LocationPositionLoading extends LocationState {
  const LocationPositionLoading();
}

/// State when current position is received
class LocationPositionReceived extends LocationState {
  const LocationPositionReceived({
    required this.latitude,
    required this.longitude,
    this.accuracy,
  });

  final double latitude;
  final double longitude;
  final double? accuracy;

  @override
  List<Object?> get props => [latitude, longitude, accuracy];
}

/// State when syncing pending locations
class LocationSyncing extends LocationState {
  const LocationSyncing({required this.pendingCount});

  final int pendingCount;

  @override
  List<Object?> get props => [pendingCount];
}

/// State when pending locations are synced
class LocationSyncComplete extends LocationState {
  const LocationSyncComplete({
    required this.syncedCount,
    required this.failedCount,
  });

  final int syncedCount;
  final int failedCount;

  @override
  List<Object?> get props => [syncedCount, failedCount];
}
