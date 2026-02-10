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
    super.assignedAt,
    super.pickedUpAt,
    super.deliveredAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'],
      salesOrderNumber: json['sales_order_number'],
      customerInfo: json['customer_info'] ?? {},
      paymentMethod: json['payment_method'] ?? 'Unknown',
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'pending',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      warehouseId: json['warehouse_id'],
      assignedAt: json['assigned_at'] != null
          ? DateTime.parse(json['assigned_at'])
          : null,
      pickedUpAt: json['picked_up_at'] != null
          ? DateTime.parse(json['picked_up_at'])
          : null,
      deliveredAt: json['delivered_at'] != null
          ? DateTime.parse(json['delivered_at'])
          : null,
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
      if (assignedAt != null) 'assigned_at': assignedAt!.toIso8601String(),
      if (pickedUpAt != null) 'picked_up_at': pickedUpAt!.toIso8601String(),
      if (deliveredAt != null) 'delivered_at': deliveredAt!.toIso8601String(),
    };
  }
}
