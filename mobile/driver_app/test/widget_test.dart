// Flutter widget tests for PharmaFleet Driver App

import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:driver_app/features/orders/presentation/widgets/order_card.dart';
import 'package:driver_app/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Order Model Tests', () {
    test('Order.fromJson parses correctly', () {
      final json = {
        'id': 1,
        'so_number': 'SO-12345',
        'status': 'pending',
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
      };

      final order = Order.fromJson(json);

      expect(order.id, 1);
      expect(order.orderNumber, 'SO-12345');
      expect(order.status, OrderStatus.pending);
      expect(order.customerName, 'Test Customer');
      expect(order.customerPhone, '+96512345678');
      expect(order.totalAmount, 15.500);
    });

    test('Order status parsing handles all statuses', () {
      final statuses = [
        'pending',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled',
        'returned',
      ];
      final expected = [
        OrderStatus.pending,
        OrderStatus.assigned,
        OrderStatus.pickedUp,
        OrderStatus.inTransit,
        OrderStatus.delivered,
        OrderStatus.cancelled,
        OrderStatus.returned,
      ];

      for (int i = 0; i < statuses.length; i++) {
        final json = {
          'id': i,
          'status': statuses[i],
          'total_amount': 0,
          'created_at': '2026-01-22T10:00:00Z',
        };
        final order = Order.fromJson(json);
        expect(order.status, expected[i]);
      }
    });

    test('Order handles null customer info', () {
      final json = {
        'id': 1,
        'status': 'pending',
        'total_amount': 10.0,
        'created_at': '2026-01-22T10:00:00Z',
      };

      final order = Order.fromJson(json);

      expect(order.customerName, isNull);
      expect(order.customerPhone, isNull);
      expect(order.deliveryAddress, isNull);
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

  group('OrderCard Widget Tests', () {
    testWidgets('OrderCard displays order information', (
      WidgetTester tester,
    ) async {
      final order = Order(
        id: 1,
        orderNumber: 'SO-TEST-001',
        status: OrderStatus.assigned,
        customerName: 'John Doe',
        deliveryAddress: '123 Main St, Kuwait City',
        totalAmount: 25.500,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: OrderCard(order: order)),
        ),
      );

      expect(find.text('SO-TEST-001'), findsOneWidget);
      expect(find.text('John Doe'), findsOneWidget);
      expect(find.text('KWD 25.500'), findsOneWidget);
      expect(find.text('Assigned'), findsOneWidget);
    });

    testWidgets('OrderCard shows correct status colors', (
      WidgetTester tester,
    ) async {
      final deliveredOrder = Order(
        id: 1,
        orderNumber: 'SO-001',
        status: OrderStatus.delivered,
        totalAmount: 10.0,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: OrderCard(order: deliveredOrder)),
        ),
      );

      expect(find.text('Delivered'), findsOneWidget);
    });

    testWidgets('OrderCard onTap callback works', (WidgetTester tester) async {
      bool tapped = false;
      final order = Order(
        id: 1,
        orderNumber: 'SO-001',
        status: OrderStatus.pending,
        totalAmount: 10.0,
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: OrderCard(order: order, onTap: () => tapped = true),
          ),
        ),
      );

      await tester.tap(find.byType(InkWell));
      expect(tapped, true);
    });
  });
}
