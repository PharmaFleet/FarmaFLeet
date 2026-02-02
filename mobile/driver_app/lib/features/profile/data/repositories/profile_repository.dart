import 'package:dio/dio.dart';

class ProfileRepository {
  final Dio _dio;

  ProfileRepository(this._dio);

  Future<Map<String, dynamic>> getDriverProfile() async {
    final response = await _dio.get('/drivers/me');
    return response.data;
  }

  Future<Map<String, dynamic>> updateDriverProfile({
    String? phone,
    String? vehiclePlate,
  }) async {
    final response = await _dio.put('/drivers/me', data: {
      if (phone != null) 'phone': phone,
      if (vehiclePlate != null) 'vehicle_plate': vehiclePlate,
    });
    return response.data;
  }
}
