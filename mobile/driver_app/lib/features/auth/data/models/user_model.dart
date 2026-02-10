import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.email,
    super.fullName,
    super.phone,
    super.isActive,
    super.isSuperuser,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as int,
      email: json['email'] as String? ?? '', // Safely handle unexpected null
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      isSuperuser: json['is_superuser'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'phone': phone,
      'is_active': isActive,
      'is_superuser': isSuperuser,
    };
  }
}
