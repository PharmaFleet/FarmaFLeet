// Flutter widget tests for PharmaFleet Driver App

import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:driver_app/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Order Model Tests', () {
    test('OrderModel.fromJson parses correctly', () {
      final json = {
        'id': 1,
        'sales_order_number': 'SO-12345',
        'status': 'PENDING',
        'customer_info': {
          'name': 'Test Customer',
          'phone': '+96512345678',
          'address': '123 Test Street',
          'latitude': 29.3759,
          'longitude': 47.9774,
        },
        'total_amount': 15.500,
        'payment_method': 'cash',
        'created_at': '2026-01-22T10:00:00Z',
        'updated_at': '2026-01-22T10:00:00Z',
        'warehouse_id': 1,
      };

      final order = OrderModel.fromJson(json);

      expect(order.id, 1);
      expect(order.salesOrderNumber, 'SO-12345');
      expect(order.status, 'PENDING');
      expect(order.customerInfo['name'], 'Test Customer');
      expect(order.customerInfo['phone'], '+96512345678');
      expect(order.totalAmount, 15.500);
    });

    test('OrderModel status parsing handles all statuses', () {
      final statuses = [
        'PENDING',
        'ASSIGNED',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'CANCELLED',
        'RETURNED',
      ];

      for (int i = 0; i < statuses.length; i++) {
        final json = {
          'id': i,
          'status': statuses[i],
          'total_amount': 0,
          'created_at': '2026-01-22T10:00:00Z',
          'updated_at': '2026-01-22T10:00:00Z',
          'warehouse_id': 1,
          'customer_info': <String, dynamic>{},
          'payment_method': 'cash',
        };
        final order = OrderModel.fromJson(json);
        expect(order.status, statuses[i]);
      }
    });

    test('OrderModel handles null customer info', () {
      final json = {
        'id': 1,
        'status': 'PENDING',
        'total_amount': 10.0,
        'created_at': '2026-01-22T10:00:00Z',
        'updated_at': '2026-01-22T10:00:00Z',
        'warehouse_id': 1,
        'payment_method': 'cash',
      };

      final order = OrderModel.fromJson(json);

      expect(order.customerInfo, isEmpty);
    });

    test('OrderModel.toJson serializes correctly', () {
      final order = OrderModel(
        id: 1,
        salesOrderNumber: 'SO-12345',
        customerInfo: const {'name': 'Test Customer'},
        paymentMethod: 'cash',
        totalAmount: 15.500,
        status: 'PENDING',
        createdAt: DateTime.parse('2026-01-22T10:00:00Z'),
        updatedAt: DateTime.parse('2026-01-22T10:00:00Z'),
        warehouseId: 1,
      );

      final json = order.toJson();

      expect(json['id'], 1);
      expect(json['sales_order_number'], 'SO-12345');
      expect(json['status'], 'PENDING');
      expect(json['total_amount'], 15.500);
    });
  });

  group('AppLocalizations Tests', () {
    test('English translations exist', () {
      final l10n = AppLocalizations(const Locale('en'));

      expect(l10n.appTitle, 'PharmaFleet Driver');
      expect(l10n.login, 'Login');
      expect(l10n.orders, 'Orders');
      expect(l10n.settings, 'Settings');
    });

    test('Arabic translations exist', () {
      final l10n = AppLocalizations(const Locale('ar'));

      expect(l10n.appTitle, 'سائق فارما فليت');
      expect(l10n.login, 'تسجيل الدخول');
      expect(l10n.orders, 'الطلبات');
      expect(l10n.settings, 'الإعدادات');
    });

    test('isArabic returns correct value', () {
      expect(AppLocalizations(const Locale('en')).isArabic, false);
      expect(AppLocalizations(const Locale('ar')).isArabic, true);
    });
  });
}
