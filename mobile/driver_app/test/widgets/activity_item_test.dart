import 'package:driver_app/theme/app_colors.dart';
import 'package:driver_app/theme/app_spacing.dart';
import 'package:driver_app/widgets/activity_item.dart';
import 'package:driver_app/widgets/status_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ActivityItem', () {
    testWidgets('displays title, timestamp, and icon', (tester) async {
      const testTitle = 'Test Activity';
      const testTimestamp = '2 hours ago';
      const testIcon = Icons.notifications;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
            ),
          ),
        ),
      );

      expect(find.text(testTitle), findsOneWidget);
      expect(find.text(testTimestamp), findsOneWidget);
      expect(find.byIcon(testIcon), findsOneWidget);
      expect(find.byIcon(Icons.access_time), findsOneWidget);
    });

    testWidgets('displays description when provided', (tester) async {
      const testTitle = 'Order Completed';
      const testDescription = 'Order #1234 delivered successfully';
      const testTimestamp = '1 hour ago';
      const testIcon = Icons.check_circle;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              description: testDescription,
              timestamp: testTimestamp,
              icon: testIcon,
            ),
          ),
        ),
      );

      expect(find.text(testDescription), findsOneWidget);
    });

    testWidgets('displays status badge when provided', (tester) async {
      const testTitle = 'Payment Processed';
      const testTimestamp = '30 minutes ago';
      const testIcon = Icons.payment;
      const testStatus = 'Completed';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              status: testStatus,
            ),
          ),
        ),
      );

      expect(find.text(testStatus), findsOneWidget);
      expect(find.byType(StatusBadge), findsOneWidget);
    });

    testWidgets('applies type-based icon colors', (tester) async {
      const testTitle = 'Activity Test';
      const testTimestamp = 'Just now';

      // Test order type
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: Icons.shopping_cart,
              type: ActivityType.order,
            ),
          ),
        ),
      );

      var icon = tester.widget<Icon>(find.byIcon(Icons.shopping_cart));
      expect(icon.color, equals(AppColors.orders));

      // Test payment type
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: Icons.payment,
              type: ActivityType.payment,
            ),
          ),
        ),
      );

      icon = tester.widget<Icon>(find.byIcon(Icons.payment));
      expect(icon.color, equals(AppColors.payments));

      // Test driver type
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: Icons.person,
              type: ActivityType.driver,
            ),
          ),
        ),
      );

      icon = tester.widget<Icon>(find.byIcon(Icons.person));
      expect(icon.color, equals(AppColors.drivers));

      // Test delivery type
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: Icons.delivery_dining,
              type: ActivityType.delivery,
            ),
          ),
        ),
      );

      icon = tester.widget<Icon>(find.byIcon(Icons.delivery_dining));
      expect(icon.color, equals(AppColors.delivery));
    });

    testWidgets('handles tap callback', (tester) async {
      bool wasTapped = false;
      const testTitle = 'Tappable Activity';
      const testTimestamp = '5 minutes ago';
      const testIcon = Icons.touch_app;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              onTap: () => wasTapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(ActivityItem));
      expect(wasTapped, isTrue);
    });

    testWidgets('applies compact mode', (tester) async {
      const testTitle = 'Compact Activity';
      const testTimestamp = 'Just now';
      const testIcon = Icons.compress;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              isCompact: true,
            ),
          ),
        ),
      );

      // Check compact styling - no description should be visible even if provided
      expect(find.text(testTitle), findsOneWidget);
      expect(find.text(testTimestamp), findsOneWidget);

      // Compact items should have smaller padding
      // EdgeInsets.symmetric(vertical: sm) means top=sm, bottom=sm, so vertical = 2*sm
      final padding = tester.widget<Padding>(find.descendant(
        of: find.byType(ActivityItem),
        matching: find.byType(Padding),
      ).first);
      final insets = padding.padding as EdgeInsets;
      expect(insets.top, equals(AppSpacing.sm));
      expect(insets.left, equals(AppSpacing.md));
    });

    testWidgets('displays trailing widget when provided', (tester) async {
      const testTitle = 'Activity with Amount';
      const testTimestamp = '1 hour ago';
      const testIcon = Icons.attach_money;
      const testAmount = '\$45.67';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              trailing: Text(testAmount),
            ),
          ),
        ),
      );

      expect(find.text(testAmount), findsOneWidget);
    });

    testWidgets('shows/hides divider based on showDivider flag', (tester) async {
      const testTitle = 'Test Activity';
      const testTimestamp = '2 hours ago';
      const testIcon = Icons.notifications;

      // Test with divider (default)
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              showDivider: true,
            ),
          ),
        ),
      );

      expect(find.byType(Divider), findsOneWidget);

      // Test without divider
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              showDivider: false,
            ),
          ),
        ),
      );

      expect(find.byType(Divider), findsNothing);
    });

    testWidgets('shows/hides timestamp based on showTimestamp flag', (tester) async {
      const testTitle = 'Test Activity';
      const testTimestamp = '2 hours ago';
      const testIcon = Icons.notifications;

      // Test with timestamp (default)
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              showTimestamp: true,
            ),
          ),
        ),
      );

      expect(find.text(testTimestamp), findsOneWidget);
      expect(find.byIcon(Icons.access_time), findsOneWidget);

      // Test without timestamp
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              showTimestamp: false,
            ),
          ),
        ),
      );

      expect(find.text(testTimestamp), findsNothing);
      expect(find.byIcon(Icons.access_time), findsNothing);
    });

    testWidgets('applies custom icon color', (tester) async {
      const testTitle = 'Custom Color Activity';
      const testTimestamp = '5 minutes ago';
      const testIcon = Icons.star;
      const customColor = Colors.purple;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              iconColor: customColor,
            ),
          ),
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(testIcon));
      expect(icon.color, equals(customColor));
    });

    testWidgets('applies semantic label', (tester) async {
      final handle = tester.ensureSemantics();
      const testTitle = 'Test Activity';
      const testTimestamp = '2 hours ago';
      const testIcon = Icons.notifications;
      const semanticLabel = 'Activity notification';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              timestamp: testTimestamp,
              icon: testIcon,
              semanticLabel: semanticLabel,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
      handle.dispose();
    });

    testWidgets('truncates long title text', (tester) async {
      const longTitle = 'This is a very long activity title that should be truncated to fit in the available space without breaking the layout';
      const testTimestamp = 'Just now';
      const testIcon = Icons.title;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: longTitle,
              timestamp: testTimestamp,
              icon: testIcon,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text(longTitle));
      expect(textWidget.maxLines, equals(2));
      expect(textWidget.overflow, equals(TextOverflow.ellipsis));
    });

    testWidgets('truncates long description text', (tester) async {
      const testTitle = 'Activity Test';
      const longDescription = 'This is a very long description that should be truncated to fit in the available space without breaking the layout or causing overflow issues';
      const testTimestamp = '5 minutes ago';
      const testIcon = Icons.description;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActivityItem(
              title: testTitle,
              description: longDescription,
              timestamp: testTimestamp,
              icon: testIcon,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text(longDescription));
      expect(textWidget.maxLines, equals(2));
      expect(textWidget.overflow, equals(TextOverflow.ellipsis));
    });
  });

  group('OrderActivityItem', () {
    testWidgets('displays order information correctly', (tester) async {
      const testOrderId = 'ORD-1234';
      const testStatus = 'Delivered';
      const testCustomerName = 'John Doe';
      const testTimestamp = '1 hour ago';
      const testAmount = 45.67;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderActivityItem(
              orderId: testOrderId,
              status: testStatus,
              customerName: testCustomerName,
              amount: testAmount,
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Order #$testOrderId Delivered'), findsOneWidget);
      expect(find.text('Customer: $testCustomerName'), findsOneWidget);
      expect(find.text('\$${testAmount.toStringAsFixed(2)}'), findsOneWidget);
      expect(find.text(testStatus), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('handles different order statuses', (tester) async {
      const testOrderId = 'ORD-5678';
      const testTimestamp = '30 minutes ago';

      // Test delivered status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderActivityItem(
              orderId: testOrderId,
              status: 'Delivered',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Order #$testOrderId Delivered'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);

      // Test cancelled status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderActivityItem(
              orderId: testOrderId,
              status: 'Cancelled',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Order #$testOrderId Cancelled'), findsOneWidget);
      expect(find.byIcon(Icons.cancel), findsOneWidget);

      // Test processing status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OrderActivityItem(
              orderId: testOrderId,
              status: 'Processing',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Order #$testOrderId Processing'), findsOneWidget);
      expect(find.byIcon(Icons.pending), findsOneWidget);
    });
  });

  group('PaymentActivityItem', () {
    testWidgets('displays payment information correctly', (tester) async {
      const testAmount = 123.45;
      const testStatus = 'Completed';
      const testOrderId = 'ORD-9876';
      const testPaymentMethod = 'Credit Card';
      const testTimestamp = '15 minutes ago';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PaymentActivityItem(
              amount: testAmount,
              status: testStatus,
              orderId: testOrderId,
              paymentMethod: testPaymentMethod,
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Payment Received'), findsOneWidget);
      expect(find.text('Order #$testOrderId via $testPaymentMethod'), findsOneWidget);
      expect(find.text('\$${testAmount.toStringAsFixed(2)}'), findsOneWidget);
      expect(find.text(testStatus), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('handles different payment statuses', (tester) async {
      const testAmount = 50.0;
      const testTimestamp = 'Just now';

      // Test completed status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PaymentActivityItem(
              amount: testAmount,
              status: 'Completed',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Payment Received'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);

      // Test failed status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PaymentActivityItem(
              amount: testAmount,
              status: 'Failed',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Payment Failed'), findsOneWidget);
      expect(find.byIcon(Icons.error), findsOneWidget);

      // Test pending status
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PaymentActivityItem(
              amount: testAmount,
              status: 'Pending',
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text('Payment Pending'), findsOneWidget);
      expect(find.byIcon(Icons.pending), findsOneWidget);
    });
  });

  group('DriverActivityItem', () {
    testWidgets('displays driver information correctly', (tester) async {
      const testDriverName = 'Sarah Wilson';
      const testDescription = 'Started delivery for order #4567';
      const testTimestamp = '10 minutes ago';
      const testStatus = 'Active';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DriverActivityItem(
              driverName: testDriverName,
              description: testDescription,
              status: testStatus,
              timestamp: testTimestamp,
            ),
          ),
        ),
      );

      expect(find.text(testDriverName), findsOneWidget);
      expect(find.text(testDescription), findsOneWidget);
      expect(find.text(testStatus), findsOneWidget);
      expect(find.byIcon(Icons.person), findsOneWidget);
    });
  });
}