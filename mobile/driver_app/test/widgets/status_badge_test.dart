import 'package:driver_app/theme/app_colors.dart';
import 'package:driver_app/theme/app_spacing.dart';
import 'package:driver_app/widgets/status_badge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('StatusBadge', () {
    testWidgets('displays text with default styling', (tester) async {
      const testText = 'Active';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
            ),
          ),
        ),
      );

      expect(find.text(testText), findsOneWidget);
      expect(find.byType(StatusBadge), findsOneWidget);

      // Check default styling
      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.surfaceVariant));
      expect(decoration.borderRadius, equals(AppSpacing.radiusChip));
    });

    testWidgets('applies success type styling', (tester) async {
      const testText = 'Completed';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              type: StatusType.success,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.successContainer));

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onSuccess));
    });

    testWidgets('applies error type styling', (tester) async {
      const testText = 'Failed';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              type: StatusType.error,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.errorContainer));

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onError));
    });

    testWidgets('applies warning type styling', (tester) async {
      const testText = 'Pending';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              type: StatusType.warning,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.warningContainer));

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onWarning));
    });

    testWidgets('applies info type styling', (tester) async {
      const testText = 'Processing';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              type: StatusType.info,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.infoContainer));

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onInfo));
    });

    testWidgets('applies custom colors', (tester) async {
      const testText = 'Custom';
      const customBgColor = Colors.purple;
      const customTextColor = Colors.white;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              backgroundColor: customBgColor,
              textColor: customTextColor,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(customBgColor));

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(customTextColor));
    });

    testWidgets('displays icon when provided', (tester) async {
      const testText = 'With Icon';
      const testIcon = Icons.star;

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              icon: testIcon,
            ),
          ),
        ),
      );

      expect(find.byIcon(testIcon), findsOneWidget);
      expect(find.text(testText), findsOneWidget);

      // Check icon and text are in a row
      expect(find.byType(Row), findsOneWidget);
    });

    testWidgets('applies different sizes', (tester) async {
      const testText = 'Size Test';

      // Test small size
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              size: StatusBadgeSize.small,
            ),
          ),
        ),
      );

      var textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.fontSize, equals(11.0));

      // Test medium size
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              size: StatusBadgeSize.medium,
            ),
          ),
        ),
      );

      textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.fontSize, equals(12.0));

      // Test large size
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              size: StatusBadgeSize.large,
            ),
          ),
        ),
      );

      textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.fontSize, equals(14.0));
    });

    testWidgets('applies compact mode', (tester) async {
      const testText = 'Compact';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              isCompact: true,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final padding = container.padding;
      expect(padding, equals(EdgeInsets.zero)); // No padding in compact mode
    });

    testWidgets('applies custom padding', (tester) async {
      const testText = 'Custom Padding';
      const customPadding = EdgeInsets.all(16.0);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              padding: customPadding,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      expect(container.padding, equals(customPadding));
    });

    testWidgets('applies semantic label', (tester) async {
      final handle = tester.ensureSemantics();
      const testText = 'Test Badge';
      const semanticLabel = 'Status: Test Badge';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              semanticLabel: semanticLabel,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
      handle.dispose();
    });

    testWidgets('applies pulse animation', (tester) async {
      const testText = 'Pulsing';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: testText,
              showPulse: true,
            ),
          ),
        ),
      );

      // Pump one frame for the animation to render Transform widget
      await tester.pump();

      // Check for the pulsing widget wrapper
      expect(find.byType(Transform), findsAtLeastNWidgets(1));
    });

    testWidgets('factory constructors work correctly', (tester) async {
      // Test orders factory
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.orders('Orders'),
          ),
        ),
      );

      var container = tester.widget<Container>(find.byType(Container));
      var decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.ordersContainer));

      // Test drivers factory
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.drivers('Drivers'),
          ),
        ),
      );

      container = tester.widget<Container>(find.byType(Container));
      decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.driversContainer));

      // Test payments factory
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.payments('Payments'),
          ),
        ),
      );

      container = tester.widget<Container>(find.byType(Container));
      decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.paymentsContainer));

      // Test analytics factory
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.analytics('Analytics'),
          ),
        ),
      );

      container = tester.widget<Container>(find.byType(Container));
      decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.analyticsContainer));

      // Test delivery factory
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.delivery('Delivery'),
          ),
        ),
      );

      container = tester.widget<Container>(find.byType(Container));
      decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.deliveryContainer));
    });

    testWidgets('truncates long text', (tester) async {
      const longText = 'This is a very long status text that should be truncated';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusBadge(
              text: longText,
              size: StatusBadgeSize.small, // Small size to test truncation
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.byType(Text));
      expect(textWidget.maxLines, equals(1));
      expect(textWidget.overflow, equals(TextOverflow.ellipsis));
    });
  });
}