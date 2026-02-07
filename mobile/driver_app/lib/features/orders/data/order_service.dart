import 'package:dio/dio.dart';
import 'package:driver_app/features/orders/data/models/order_model.dart';

/// Driver statistics from backend
class DriverStats {
  final int driverId;
  final int totalDeliveries;
  final int todayDeliveries;
  final double totalEarnings;
  final double todayEarnings;
  final double averageRating;
  final double onTimeRate;
  final int activeOrders;

  const DriverStats({
    required this.driverId,
    required this.totalDeliveries,
    required this.todayDeliveries,
    required this.totalEarnings,
    required this.todayEarnings,
    required this.averageRating,
    required this.onTimeRate,
    required this.activeOrders,
  });

  factory DriverStats.fromJson(Map<String, dynamic> json) {
    return DriverStats(
      driverId: json['driver_id'] ?? 0,
      totalDeliveries: json['total_deliveries'] ?? 0,
      todayDeliveries: json['today_deliveries'] ?? 0,
      totalEarnings: (json['total_earnings'] as num?)?.toDouble() ?? 0.0,
      todayEarnings: (json['today_earnings'] as num?)?.toDouble() ?? 0.0,
      averageRating: (json['average_rating'] as num?)?.toDouble() ?? 5.0,
      onTimeRate: (json['on_time_rate'] as num?)?.toDouble() ?? 100.0,
      activeOrders: json['active_orders'] ?? 0,
    );
  }
}

class OrderService {
  final Dio _dio;

  OrderService(this._dio);

  Future<List<OrderModel>> getMyOrders() async {
    final response = await _dio.get('/drivers/me/orders');
    final dynamic responseData = response.data;
    final List<dynamic> data = responseData is List
        ? responseData
        : (responseData['items'] ?? []);
    return data.map((json) => OrderModel.fromJson(json)).toList();
  }

  /// Fetch driver statistics from backend
  Future<DriverStats> getDriverStats() async {
    final response = await _dio.get('/drivers/me/stats');
    return DriverStats.fromJson(response.data);
  }

  Future<void> updateOrderStatus(int orderId, String status) async {
    await _dio.patch('/orders/$orderId/status', data: {'status': status});
  }

  Future<void> acceptOrder(int orderId) async {
    await updateOrderStatus(orderId, 'picked_up');
  }

  Future<void> startDelivery(int orderId) async {
    await updateOrderStatus(orderId, 'in_transit');
  }

  Future<void> completeDelivery(
    int orderId, {
    String? photoPath,
    String? notes,
  }) async {
    final formData = FormData.fromMap({
      'status': 'delivered',
      if (notes != null) 'notes': notes,
      if (photoPath != null)
        'photo': await MultipartFile.fromFile(photoPath, filename: 'proof.jpg'),
    });
    await _dio.patch('/orders/$orderId/status', data: formData);
  }
}
