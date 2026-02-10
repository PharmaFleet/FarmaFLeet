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

  @override
  Future<Map<String, dynamic>> batchPickupOrders(List<int> orderIds) async {
    debugPrint('[OrderRepo] Batch pickup for orders: $orderIds');
    try {
      final response = await dio.post(
        '/orders/batch-pickup',
        data: {'order_ids': orderIds},
      );
      debugPrint('[OrderRepo] Batch pickup successful: ${response.data}');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      debugPrint('[OrderRepo] Batch pickup DioException: ${e.response?.statusCode} - ${e.message}');
      debugPrint('[OrderRepo] Response data: ${e.response?.data}');
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized - please login again');
      }
      throw Exception('Failed to batch pickup orders: ${e.message}');
    } catch (e) {
      debugPrint('[OrderRepo] Batch pickup Exception: $e');
      throw Exception('Failed to batch pickup orders: $e');
    }
  }

  @override
  Future<Map<String, dynamic>> batchDeliveryOrders(List<int> orderIds, List<Map<String, dynamic>>? proofs) async {
    debugPrint('[OrderRepo] Batch delivery for orders: $orderIds');
    try {
      final data = <String, dynamic>{'order_ids': orderIds};
      if (proofs != null && proofs.isNotEmpty) {
        data['proofs'] = proofs;
      }

      final response = await dio.post(
        '/orders/batch-delivery',
        data: data,
      );
      debugPrint('[OrderRepo] Batch delivery successful: ${response.data}');
      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      debugPrint('[OrderRepo] Batch delivery DioException: ${e.response?.statusCode} - ${e.message}');
      debugPrint('[OrderRepo] Response data: ${e.response?.data}');
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized - please login again');
      }
      throw Exception('Failed to batch deliver orders: ${e.message}');
    } catch (e) {
      debugPrint('[OrderRepo] Batch delivery Exception: $e');
      throw Exception('Failed to batch deliver orders: $e');
    }
  }

  @override
  Future<void> returnOrder(int id, String reason) async {
    debugPrint('[OrderRepo] Returning order $id with reason: $reason');
    try {
      await dio.post(
        '/orders/$id/return',
        data: {'reason': reason},
      );
      debugPrint('[OrderRepo] Order $id returned successfully');
    } on DioException catch (e) {
      debugPrint('[OrderRepo] Return order DioException: ${e.response?.statusCode} - ${e.message}');
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized - please login again');
      }
      throw Exception('Failed to return order: ${e.message}');
    } catch (e) {
      debugPrint('[OrderRepo] Return order Exception: $e');
      throw Exception('Failed to return order: $e');
    }
  }
}
