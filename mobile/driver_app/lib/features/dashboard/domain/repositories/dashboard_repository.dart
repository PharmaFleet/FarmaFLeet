import '../../../auth/domain/entities/user_entity.dart';

abstract class DashboardRepository {
  /// Updates the driver's availability status (Online/Offline)
  Future<UserEntity> updateStatus(bool isAvailable);

  /// Updates the driver's current location
  Future<void> updateLocation(double latitude, double longitude);
}
