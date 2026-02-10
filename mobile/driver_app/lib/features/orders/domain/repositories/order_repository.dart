import '../entities/order_entity.dart';

abstract class OrderRepository {
  /// Fetches the list of orders assigned to the driver
  /// Optional [statusFilter] can be 'pending', 'delivered', etc.
  Future<List<OrderEntity>> getOrders({String? statusFilter});

  /// Fetches a single order's details
  Future<OrderEntity> getOrderDetails(int id);

  /// Updates the order status
  Future<void> updateOrderStatus(int id, String status, {String? notes});

  /// Uploads a file and returns the URL
  Future<String> uploadFile(String filePath);

  /// Submits Proof of Delivery
  Future<void> submitProofOfDelivery(int id, String photoUrl, String? signatureUrl);

  /// Batch pickup multiple orders at once
  /// Returns a map with 'updated_count' and optionally 'errors'
  Future<Map<String, dynamic>> batchPickupOrders(List<int> orderIds);

  /// Batch deliver multiple orders at once
  /// Optional [proofs] is a list of maps containing order-specific proof of delivery data
  /// Each proof map can contain: order_id, photo_url, signature_url, notes
  /// Returns a map with 'updated_count' and optionally 'errors'
  Future<Map<String, dynamic>> batchDeliveryOrders(List<int> orderIds, List<Map<String, dynamic>>? proofs);

  /// Returns a delivered order with a reason
  Future<void> returnOrder(int id, String reason);
}
