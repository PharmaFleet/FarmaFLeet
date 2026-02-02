// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'location_model.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LocationUpdateModelAdapter extends TypeAdapter<LocationUpdateModel> {
  @override
  final int typeId = 1;

  @override
  LocationUpdateModel read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LocationUpdateModel(
      id: fields[0] as String?,
      driverId: fields[1] as String,
      latitude: fields[2] as double,
      longitude: fields[3] as double,
      accuracy: fields[4] as double?,
      timestamp: fields[5] as DateTime,
      speed: fields[6] as double?,
      heading: fields[7] as double?,
      synced: fields[8] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, LocationUpdateModel obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.driverId)
      ..writeByte(2)
      ..write(obj.latitude)
      ..writeByte(3)
      ..write(obj.longitude)
      ..writeByte(4)
      ..write(obj.accuracy)
      ..writeByte(5)
      ..write(obj.timestamp)
      ..writeByte(6)
      ..write(obj.speed)
      ..writeByte(7)
      ..write(obj.heading)
      ..writeByte(8)
      ..write(obj.synced);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocationUpdateModelAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
