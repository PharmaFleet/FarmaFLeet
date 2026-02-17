import 'package:driver_app/features/orders/domain/entities/order_entity.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests for OrderEntity with warehouse and payment fields (Tasks 1 & 2).

void main() {
  group('OrderEntity - Warehouse fields (Task 1)', () {
    test('supports warehouseName and warehouseCode', () {
      final entity = OrderEntity(
        id: 1,
        customerInfo: const {},
        paymentMethod: 'CASH',
        totalAmount: 10.0,
        status: 'pending',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        warehouseId: 1,
        warehouseName: 'Main Warehouse',
        warehouseCode: 'DW001',
      );

      expect(entity.warehouseName, 'Main Warehouse');
      expect(entity.warehouseCode, 'DW001');
    });

    test('warehouse fields default to null', () {
      final entity = OrderEntity(
        id: 2,
        customerInfo: const {},
        paymentMethod: 'COD',
        totalAmount: 5.0,
        status: 'assigned',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        warehouseId: 1,
      );

      expect(entity.warehouseName, isNull);
      expect(entity.warehouseCode, isNull);
    });

    test('warehouse fields included in props for Equatable', () {
      final e1 = OrderEntity(
        id: 1,
        customerInfo: const {},
        paymentMethod: 'CASH',
        totalAmount: 10.0,
        status: 'pending',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        warehouseId: 1,
        warehouseName: 'WH-A',
        warehouseCode: 'A01',
      );

      final e2 = OrderEntity(
        id: 1,
        customerInfo: const {},
        paymentMethod: 'CASH',
        totalAmount: 10.0,
        status: 'pending',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        warehouseId: 1,
        warehouseName: 'WH-B',
        warehouseCode: 'B01',
      );

      // Different warehouse fields should make them unequal
      expect(e1, isNot(equals(e2)));
    });
  });
}
