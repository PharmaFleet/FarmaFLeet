import '../entities/order_entity.dart';

abstract class OrderRepository {
  /// Fetches the list of orders assigned to the driver
  /// Optional [statusFilter] can be 'PENDING', 'DELIVERED', etc.
  Future<List<OrderEntity>> getOrders({String? statusFilter});

  /// Fetches a single order's details
  Future<OrderEntity> getOrderDetails(int id);

  /// Updates the order status
  Future<void> updateOrderStatus(int id, String status, {String? notes});

  /// Uploads a file and returns the URL
  Future<String> uploadFile(String filePath);

  /// Submits Proof of Delivery
  Future<void> submitProofOfDelivery(int id, String photoUrl, String? signatureUrl);
}
