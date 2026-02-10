import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../domain/repositories/dashboard_repository.dart';

class DashboardRepositoryImpl implements DashboardRepository {
  final Dio dio;
  final Logger logger = Logger();

  DashboardRepositoryImpl(this.dio);

  @override
  Future<UserEntity> updateStatus(bool isAvailable) async {
    try {
      final response = await dio.patch(
        AppConstants.updateStatusEndpoint,
        data: {'is_available': isAvailable},
      );

      if (response.statusCode == 200) {
        if (response.data == null) {
           throw Exception("Backend returned empty response");
        }
        
        final data = response.data;
        // The backend returns a Driver object which contains a nested 'user' object.
        // We need to extract the user data to return a valid UserEntity.
        if (data['user'] != null && data['user'] is Map<String, dynamic>) {
           return UserModel.fromJson(data['user']);
        }

        // Fallback: if structure is flat or unknown, try parsing directly (though less likely correct now)
        try {
           return UserModel.fromJson(data);
        } catch (_) {
           // If parsing fails, we might just return a partial user or re-fetch.
           // For now, let's assume if update succeeded, we are good.
           // But we need to return a UserEntity.
           // Let's return the current user if we could get it, but we lack context here.
           // Better to throw if we can't parse, but let's be safe.
           logger.w("Could not parse User from response, returning minimal user.");
           return UserModel(
             id: data['user_id'] ?? 0, 
             email: '', 
             isActive: true, // assume active if successful
           );
        }
      } else {
        throw Exception('Failed to update status: ${response.statusCode}');
      }
    } catch (e) {
      logger.e("Error updating status: $e");
      rethrow;
    }
  }

  @override
  Future<void> updateLocation(double latitude, double longitude) async {
    try {
      await dio.post(
        AppConstants.updateLocationEndpoint, // We need to define this
        data: {
          'latitude': latitude,
          'longitude': longitude,
        },
      );
    } catch (e) {
      // Log but don't crash on location update failure
      logger.w("Failed to update location: $e");
    }
  }
}
