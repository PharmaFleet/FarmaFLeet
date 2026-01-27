import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/widgets/stat_card.dart';
import 'package:driver_app/theme/app_colors.dart';

void main() {
  group('StatCard', () {
    testWidgets('displays title, value, and description', (tester) async {
      const testTitle = 'Total Orders';
      const testValue = '1,234';
      const testDescription = '+12% from last month';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              description: testDescription,
              icon: Icons.shopping_cart,
            ),
          ),
        ),
      );

      expect(find.text(testTitle), findsOneWidget);
      expect(find.text(testValue), findsOneWidget);
      expect(find.text(testDescription), findsOneWidget);
      expect(find.byIcon(Icons.shopping_cart), findsOneWidget);
    });

    testWidgets('applies custom value color', (tester) async {
      const testTitle = 'Revenue';
      const testValue = '\$45,678';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.attach_money,
              valueColor: AppColors.success,
            ),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.text(testValue));
      expect(textWidget.style?.color, equals(AppColors.success));
    });

    testWidgets('applies custom icon color', (tester) async {
      const testTitle = 'Active Users';
      const testValue = '567';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.people,
              iconColor: AppColors.orders,
            ),
          ),
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(Icons.people));
      expect(icon.color, equals(AppColors.orders));
    });

    testWidgets('displays loading state', (tester) async {
      const testTitle = 'Loading Stat';
      const testValue = '---';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(title: testTitle, value: testValue, isLoading: true),
          ),
        ),
      );

      // Should show loading placeholders instead of actual content
      expect(find.text(testTitle), findsNothing);
      expect(find.text(testValue), findsNothing);

      // Should show placeholder containers
      expect(
        find.byType(Container),
        findsWidgets,
      ); // Multiple placeholder containers
    });

    testWidgets('handles tap callback', (tester) async {
      bool wasTapped = false;
      const testTitle = 'Clickable Stat';
      const testValue = '123';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.analytics,
              onTap: () => wasTapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(StatCard));
      expect(wasTapped, isTrue);
    });

    testWidgets('displays trend indicator', (tester) async {
      const testTitle = 'Monthly Revenue';
      const testValue = '\$10,000';
      const trend = '+15%';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.trending_up,
              trend: trend,
              trendType: TrendType.up,
            ),
          ),
        ),
      );

      expect(find.text(trend), findsOneWidget);
      expect(find.byIcon(Icons.trending_up), findsOneWidget);

      final trendText = tester.widget<Text>(find.text(trend));
      expect(trendText.style?.color, equals(AppColors.success));
    });

    testWidgets('displays different trend types', (tester) async {
      const testTitle = 'Performance';
      const testValue = '85%';

      // Test up trend
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.trending_up,
              trend: 'Good',
              trendType: TrendType.up,
            ),
          ),
        ),
      );

      var trendText = tester.widget<Text>(find.text('Good'));
      expect(trendText.style?.color, equals(AppColors.success));

      // Test down trend
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.trending_down,
              trend: 'Poor',
              trendType: TrendType.down,
            ),
          ),
        ),
      );

      trendText = tester.widget<Text>(find.text('Poor'));
      expect(trendText.style?.color, equals(AppColors.error));

      // Test neutral trend
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.trending_flat,
              trend: 'Same',
              trendType: TrendType.neutral,
            ),
          ),
        ),
      );

      trendText = tester.widget<Text>(find.text('Same'));
      expect(trendText.style?.color, equals(AppColors.textSecondary));
    });

    testWidgets('displays footer widget', (tester) async {
      const testTitle = 'Stat with Footer';
      const testValue = '100';
      const footerText = 'View Details';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.info,
              footer: Text(
                footerText,
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text(footerText), findsOneWidget);
    });

    testWidgets('applies semantic label', (tester) async {
      const testTitle = 'Orders';
      const testValue = '50';
      const testDescription = 'This week';
      const semanticLabel = 'Orders Status: 50 this week';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              description: testDescription,
              semanticLabel: semanticLabel,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
    });

    testWidgets('applies custom background color', (tester) async {
      const testTitle = 'Colored Stat';
      const testValue = '75';
      const bgColor = Colors.amber;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatCard(
              title: testTitle,
              value: testValue,
              icon: Icons.star,
              backgroundColor: bgColor,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(bgColor));
    });
  });

  group('FinancialStatCard', () {
    testWidgets('displays financial data with currency', (tester) async {
      const testTitle = 'Total Revenue';
      const testAmount = 1234.56;
      const testDescription = 'Q1 2024';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FinancialStatCard(
              title: testTitle,
              amount: testAmount,
              description: testDescription,
            ),
          ),
        ),
      );

      expect(find.text(testTitle), findsOneWidget);
      expect(find.text('\$1.2K'), findsOneWidget); // Formatted amount
      expect(find.text(testDescription), findsOneWidget);
      expect(find.byIcon(Icons.attach_money), findsOneWidget);
    });

    testWidgets('formats large amounts correctly', (tester) async {
      const testTitle = 'Revenue';
      const amounts = [999.99, 1234.56, 1234567.89];

      for (final amount in amounts) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: FinancialStatCard(title: testTitle, amount: amount),
            ),
          ),
        );

        String expectedFormatted;
        if (amount >= 1000000) {
          expectedFormatted = '\${(amount / 1000000).toStringAsFixed(1)}M';
        } else if (amount >= 1000) {
          expectedFormatted = '\${(amount / 1000).toStringAsFixed(1)}K';
        } else {
          expectedFormatted = '\$${amount.toStringAsFixed(2)}';
        }

        expect(find.text(expectedFormatted), findsOneWidget);
      }
    });

    testWidgets('displays change indicators', (tester) async {
      const testTitle = 'Monthly Revenue';
      const testAmount = 5000.0;
      const changeAmount = 500.0;

      // Test positive change
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FinancialStatCard(
              title: testTitle,
              amount: testAmount,
              changeAmount: changeAmount,
              isPositiveChange: true,
            ),
          ),
        ),
      );

      expect(find.text('+500.0'), findsOneWidget);
      expect(find.byIcon(Icons.trending_up), findsOneWidget);

      // Test negative change
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FinancialStatCard(
              title: testTitle,
              amount: testAmount,
              changeAmount: changeAmount,
              isPositiveChange: false,
            ),
          ),
        ),
      );

      expect(find.text('-$changeAmount'), findsOneWidget);
      expect(find.byIcon(Icons.trending_down), findsOneWidget);
    });
  });

  group('CountStatCard', () {
    testWidgets('displays count data', (tester) async {
      const testTitle = 'Total Users';
      const testCount = 1234;
      const testDescription = 'Active today';
      const testIcon = Icons.people;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CountStatCard(
              title: testTitle,
              count: testCount,
              description: testDescription,
              icon: testIcon,
              color: AppColors.orders,
            ),
          ),
        ),
      );

      expect(find.text(testTitle), findsOneWidget);
      expect(find.text('1.2K'), findsOneWidget); // Formatted count
      expect(find.text(testDescription), findsOneWidget);
      expect(find.byIcon(testIcon), findsOneWidget);
    });

    testWidgets('formats large counts correctly', (tester) async {
      const testTitle = 'Items';
      const counts = [999, 1234, 1234567];

      for (final count in counts) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CountStatCard(
                title: testTitle,
                count: count,
                icon: Icons.inventory,
                color: AppColors.primary,
              ),
            ),
          ),
        );

        String expectedFormatted;
        if (count >= 1000000) {
          expectedFormatted = '${(count / 1000000).toStringAsFixed(1)}M';
        } else if (count >= 1000) {
          expectedFormatted = '${(count / 1000).toStringAsFixed(1)}K';
        } else {
          expectedFormatted = count.toString();
        }

        expect(find.text(expectedFormatted), findsOneWidget);
      }
    });

    testWidgets('displays change indicators', (tester) async {
      const testTitle = 'Orders';
      const testCount = 100;
      const changeCount = 25;

      // Test positive change
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CountStatCard(
              title: testTitle,
              count: testCount,
              changeCount: changeCount,
              isPositiveChange: true,
              icon: Icons.shopping_cart,
              color: AppColors.orders,
            ),
          ),
        ),
      );

      expect(find.text('+$changeCount'), findsOneWidget);
      expect(find.byIcon(Icons.trending_up), findsOneWidget);

      // Test negative change
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CountStatCard(
              title: testTitle,
              count: testCount,
              changeCount: changeCount,
              isPositiveChange: false,
              icon: Icons.shopping_cart,
              color: AppColors.orders,
            ),
          ),
        ),
      );

      expect(find.text('-$changeCount'), findsOneWidget);
      expect(find.byIcon(Icons.trending_down), findsOneWidget);
    });
  });
}
