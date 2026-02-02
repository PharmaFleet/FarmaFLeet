import 'package:equatable/equatable.dart';

abstract class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

class ProfileInitial extends ProfileState {}

class ProfileLoading extends ProfileState {}

class ProfileLoaded extends ProfileState {
  final String fullName;
  final String email;
  final String? phone;
  final String? vehiclePlate;
  final String? vehicleType;
  final String? warehouseName;
  final bool isOnline;
  final int totalDeliveries;
  final double? rating;

  const ProfileLoaded({
    required this.fullName,
    required this.email,
    this.phone,
    this.vehiclePlate,
    this.vehicleType,
    this.warehouseName,
    required this.isOnline,
    required this.totalDeliveries,
    this.rating,
  });

  @override
  List<Object?> get props => [
        fullName,
        email,
        phone,
        vehiclePlate,
        vehicleType,
        warehouseName,
        isOnline,
        totalDeliveries,
        rating,
      ];
}

class ProfileError extends ProfileState {
  final String message;

  const ProfileError(this.message);

  @override
  List<Object?> get props => [message];
}
