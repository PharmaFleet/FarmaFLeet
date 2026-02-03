import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';
import '../models/order_model.dart';

class OrderRepositoryImpl implements OrderRepository {
  final Dio dio;

  OrderRepositoryImpl(this.dio);

  @override
  Future<List<OrderEntity>> getOrders({String? statusFilter}) async {
    debugPrint('[OrderRepo] Fetching orders with filter: $statusFilter');
    try {
      final queryParams = <String, dynamic>{};
      if (statusFilter != null) {
        queryParams['status_filter'] = statusFilter;
      }

      final response = await dio.get(
        '/drivers/me/orders',
        queryParameters: queryParams,
      );

      debugPrint('[OrderRepo] Orders fetched successfully: ${(response.data as List).length} orders');
      final List<dynamic> data = response.data;
      return data.map((json) => OrderModel.fromJson(json)).toList();
    } on DioException catch (e) {
      debugPrint('[OrderRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      debugPrint('[OrderRepo] Response data: ${e.response?.data}');
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized - please login again');
      }
      throw Exception('Failed to fetch orders: ${e.message}');
    } catch (e) {
      debugPrint('[OrderRepo] Exception: $e');
      throw Exception('Failed to fetch orders: $e');
    }
  }

  @override
  Future<OrderEntity> getOrderDetails(int id) async {
    try {
      final response = await dio.get('/orders/$id');
      return OrderModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to fetch order details: $e');
    }
  }

  @override
  Future<void> updateOrderStatus(int id, String status, {String? notes}) async {
    try {
      await dio.patch(
        '/orders/$id/status',
        data: {
          'status': status,
          if (notes != null) 'notes': notes,
        },
      );
    } catch (e) {
      throw Exception('Failed to update status: $e');
    }
  }

  @override
  Future<String> uploadFile(String filePath) async {
    try {
      final fileName = filePath.split('/').last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: fileName),
      });

      final response = await dio.post('/upload', data: formData);
      return response.data['url'];
    } catch (e) {
      throw Exception('Failed to upload file: $e');
    }
  }

  @override
  Future<void> submitProofOfDelivery(int id, String photoUrl, String? signatureUrl) async {
    try {
      await dio.post(
        '/orders/$id/proof-of-delivery-url',
        data: {
          'photo_url': photoUrl,
          'signature_url': signatureUrl,
        },
      );
    } catch (e) {
      throw Exception('Failed to submit POD: $e');
    }
  }
}
