import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tests for OrderModel JSON parsing with warehouse fields (Task 1)
/// and payment method field (Task 2).
///
/// Covers:
/// - Parsing warehouse name and code from nested JSON
/// - Null warehouse handling
/// - Payment method parsing

void main() {
  group('OrderModel - Warehouse Parsing (Task 1)', () {
    test('parses warehouse name and code from nested object', () {
      final json = {
        'id': 1,
        'sales_order_number': 'SO-001',
        'customer_info': {'name': 'Test', 'address': '123 St'},
        'payment_method': 'CASH',
        'total_amount': 10.0,
        'status': 'pending',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
        'warehouse': {
          'id': 1,
          'name': 'Main Warehouse',
          'code': 'DW001',
        },
      };

      final model = OrderModel.fromJson(json);

      expect(model.warehouseName, 'Main Warehouse');
      expect(model.warehouseCode, 'DW001');
      expect(model.warehouseId, 1);
    });

    test('handles null warehouse gracefully', () {
      final json = {
        'id': 2,
        'customer_info': <String, dynamic>{},
        'payment_method': 'COD',
        'total_amount': 5.0,
        'status': 'assigned',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
        'warehouse': null,
      };

      final model = OrderModel.fromJson(json);

      expect(model.warehouseName, isNull);
      expect(model.warehouseCode, isNull);
    });

    test('handles missing warehouse key gracefully', () {
      final json = {
        'id': 3,
        'customer_info': <String, dynamic>{},
        'payment_method': 'KNET',
        'total_amount': 20.0,
        'status': 'delivered',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 2,
      };

      final model = OrderModel.fromJson(json);

      expect(model.warehouseName, isNull);
      expect(model.warehouseCode, isNull);
    });

    test('warehouse with partial data (name only)', () {
      final json = {
        'id': 4,
        'customer_info': <String, dynamic>{},
        'payment_method': 'LINK',
        'total_amount': 15.0,
        'status': 'pending',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
        'warehouse': {
          'id': 1,
          'name': 'Branch',
        },
      };

      final model = OrderModel.fromJson(json);

      expect(model.warehouseName, 'Branch');
      expect(model.warehouseCode, isNull);
    });
  });

  group('OrderModel - Payment Method (Task 2)', () {
    test('parses payment method correctly', () {
      final json = {
        'id': 10,
        'customer_info': <String, dynamic>{},
        'payment_method': 'CREDIT_CARD',
        'total_amount': 50.0,
        'status': 'assigned',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
      };

      final model = OrderModel.fromJson(json);
      expect(model.paymentMethod, 'CREDIT_CARD');
    });

    test('defaults to Unknown when payment_method is null', () {
      final json = {
        'id': 11,
        'customer_info': <String, dynamic>{},
        'payment_method': null,
        'total_amount': 0.0,
        'status': 'pending',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
      };

      final model = OrderModel.fromJson(json);
      expect(model.paymentMethod, 'Unknown');
    });
  });

  group('OrderModel - toJson roundtrip', () {
    test('warehouse fields are not included in toJson (server-only)', () {
      final json = {
        'id': 20,
        'sales_order_number': 'SO-020',
        'customer_info': {'name': 'Test'},
        'payment_method': 'CASH',
        'total_amount': 10.0,
        'status': 'pending',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
        'warehouse_id': 1,
        'warehouse': {'name': 'WH', 'code': 'C1'},
      };

      final model = OrderModel.fromJson(json);
      final output = model.toJson();

      // toJson should have warehouse_id but not warehouse name/code
      expect(output['warehouse_id'], 1);
      expect(output.containsKey('warehouse_name'), false);
      expect(output.containsKey('warehouse_code'), false);
    });
  });
}
