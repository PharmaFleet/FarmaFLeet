import 'package:equatable/equatable.dart';
import 'package:hive/hive.dart';

part 'location_model.g.dart';

/// Model representing a location update for a driver.
/// Used for tracking driver positions during deliveries.
@HiveType(typeId: 1)
class LocationUpdateModel extends Equatable {
  const LocationUpdateModel({
    required this.driverId,
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    this.accuracy,
    this.speed,
    this.heading,
    this.id,
    this.synced = false,
  });

  /// Unique identifier for this location update (for Hive storage)
  @HiveField(0)
  final String? id;

  /// Driver identifier
  @HiveField(1)
  final String driverId;

  /// Latitude coordinate
  @HiveField(2)
  final double latitude;

  /// Longitude coordinate
  @HiveField(3)
  final double longitude;

  /// Location accuracy in meters
  @HiveField(4)
  final double? accuracy;

  /// Timestamp of the location update
  @HiveField(5)
  final DateTime timestamp;

  /// Speed in meters per second
  @HiveField(6)
  final double? speed;

  /// Heading direction in degrees (0-360)
  @HiveField(7)
  final double? heading;

  /// Whether this update has been synced to the backend
  @HiveField(8)
  final bool synced;

  /// Convert model to JSON for API requests
  Map<String, dynamic> toJson() {
    return {
      'driver_id': driverId,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'timestamp': timestamp.toIso8601String(),
      'speed': speed,
      'heading': heading,
    };
  }

  /// Create model from JSON response
  factory LocationUpdateModel.fromJson(Map<String, dynamic> json) {
    return LocationUpdateModel(
      driverId: json['driver_id'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracy: json['accuracy'] != null
          ? (json['accuracy'] as num).toDouble()
          : null,
      timestamp: DateTime.parse(json['timestamp'] as String),
      speed: json['speed'] != null ? (json['speed'] as num).toDouble() : null,
      heading:
          json['heading'] != null ? (json['heading'] as num).toDouble() : null,
      id: json['id'] as String?,
      synced: json['synced'] as bool? ?? true,
    );
  }

  /// Create a copy with updated fields
  LocationUpdateModel copyWith({
    String? id,
    String? driverId,
    double? latitude,
    double? longitude,
    double? accuracy,
    DateTime? timestamp,
    double? speed,
    double? heading,
    bool? synced,
  }) {
    return LocationUpdateModel(
      id: id ?? this.id,
      driverId: driverId ?? this.driverId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      timestamp: timestamp ?? this.timestamp,
      speed: speed ?? this.speed,
      heading: heading ?? this.heading,
      synced: synced ?? this.synced,
    );
  }

  @override
  List<Object?> get props => [
        id,
        driverId,
        latitude,
        longitude,
        accuracy,
        timestamp,
        speed,
        heading,
        synced,
      ];

  @override
  String toString() {
    return 'LocationUpdateModel(driverId: $driverId, lat: $latitude, lng: $longitude, time: $timestamp)';
  }
}
