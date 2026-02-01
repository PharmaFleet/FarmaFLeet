import 'package:equatable/equatable.dart';

class OrderEntity extends Equatable {
  final int id;
  final String? salesOrderNumber;
  final Map<String, dynamic> customerInfo;
  final String paymentMethod;
  final double totalAmount;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int warehouseId;

  const OrderEntity({
    required this.id,
    this.salesOrderNumber,
    required this.customerInfo,
    required this.paymentMethod,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.warehouseId,
  });

  @override
  List<Object?> get props => [
        id,
        salesOrderNumber,
        customerInfo,
        paymentMethod,
        totalAmount,
        status,
        createdAt,
        updatedAt,
        warehouseId,
      ];
}
