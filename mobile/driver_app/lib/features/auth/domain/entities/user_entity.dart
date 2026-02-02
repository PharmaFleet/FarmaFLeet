import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final int id;
  final String email;
  final String? fullName;
  final String? phone;
  final bool isActive;
  final bool isSuperuser;

  const UserEntity({
    required this.id,
    required this.email,
    this.fullName,
    this.phone,
    this.isActive = true,
    this.isSuperuser = false,
  });

  @override
  List<Object?> get props => [id, email, fullName, phone, isActive, isSuperuser];
}
