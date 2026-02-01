import '../../domain/entities/order_entity.dart';

class OrderModel extends OrderEntity {
  const OrderModel({
    required super.id,
    super.salesOrderNumber,
    required super.customerInfo,
    required super.paymentMethod,
    required super.totalAmount,
    required super.status,
    required super.createdAt,
    required super.updatedAt,
    required super.warehouseId,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'],
      salesOrderNumber: json['sales_order_number'],
      customerInfo: json['customer_info'] ?? {},
      paymentMethod: json['payment_method'] ?? 'Unknown',
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'PENDING',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      warehouseId: json['warehouse_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sales_order_number': salesOrderNumber,
      'customer_info': customerInfo,
      'payment_method': paymentMethod,
      'total_amount': totalAmount,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'warehouse_id': warehouseId,
    };
  }
}
