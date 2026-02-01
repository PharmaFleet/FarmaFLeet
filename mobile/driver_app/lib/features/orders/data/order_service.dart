import 'package:dio/dio.dart';
import 'package:driver_app/features/orders/data/models/order_model.dart';

class OrderService {
  final Dio _dio;

  OrderService(this._dio);

  Future<List<Order>> getMyOrders() async {
    final response = await _dio.get('/drivers/me/orders');
    final dynamic responseData = response.data;
    final List<dynamic> data = responseData is List
        ? responseData
        : (responseData['items'] ?? []);
    return data.map((json) => Order.fromJson(json)).toList();
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
