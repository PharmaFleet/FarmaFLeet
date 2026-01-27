import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/widgets/card_container.dart';
import 'package:driver_app/theme/app_colors.dart';
import 'package:driver_app/theme/app_spacing.dart';

void main() {
  group('CardContainer', () {
    testWidgets('displays child widget with default styling', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              child: testChild,
            ),
          ),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
      expect(find.byType(CardContainer), findsOneWidget);

      // Check default padding is applied
      final container = tester.widget<Container>(find.byType(Container).first);
      final padding = container.decoration as BoxDecoration;
      expect(padding.color, equals(AppColors.surface));
      expect(padding.borderRadius, equals(AppSpacing.radiusCard));
    });

    testWidgets('applies custom padding', (tester) async {
      const customPadding = EdgeInsets.all(8.0);
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              padding: customPadding,
              child: testChild,
            ),
          ),
        ),
      );

      final paddingWidget = tester.widget<Padding>(find.byType(Padding).first);
      expect(paddingWidget.padding, equals(customPadding));
    });

    testWidgets('applies custom margin', (tester) async {
      const customMargin = EdgeInsets.all(16.0);
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              margin: customMargin,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      expect(container.margin, equals(customMargin));
    });

    testWidgets('applies custom background color', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              backgroundColor: AppColors.primary,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.primary));
    });

    testWidgets('applies custom border radius', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              borderRadius: AppSpacing.radiusXL,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.borderRadius, equals(AppSpacing.radiusXL));
    });

    testWidgets('applies custom border', (tester) async {
      const testChild = Text('Test Content');
      final border = Border.all(color: Colors.red, width: 2);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              border: border,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.border, equals(border));
    });

    testWidgets('applies custom elevation', (tester) async {
      const testChild = Text('Test Content');
      const elevation = 8.0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              elevation: elevation,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.boxShadow, isNotNull);
      expect(decoration.boxShadow!.length, equals(1));
      expect(decoration.boxShadow!.first.blurRadius, equals(elevation * 2));
      expect(decoration.boxShadow!.first.offset, equals(const Offset(0, elevation)));
    });

    testWidgets('disables shadow when showShadow is false', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              showShadow: false,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.boxShadow, isNull);
    });

    testWidgets('handles tap callback', (tester) async {
      bool wasTapped = false;
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              onTap: () => wasTapped = true,
              child: testChild,
            ),
          ),
        ),
      );

      expect(find.byType(InkWell), findsOneWidget);
      await tester.tap(find.byType(CardContainer));
      expect(wasTapped, isTrue);
    });

    testWidgets('applies semantic label', (tester) async {
      const testChild = Text('Test Content');
      const semanticLabel = 'Card Description';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              semanticLabel: semanticLabel,
              child: testChild,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
    });

    testWidgets('applies custom width and height', (tester) async {
      const testChild = Text('Test Content');
      const width = 200.0;
      const height = 100.0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CardContainer(
              width: width,
              height: height,
              child: testChild,
            ),
          ),
        ),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox).first);
      expect(sizedBox.width, equals(width));
      expect(sizedBox.height, equals(height));
    });
  });

  group('BorderedCardContainer', () {
    testWidgets('displays with border', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BorderedCardContainer(
              child: testChild,
            ),
          ),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.border, isNotNull);
      expect(decoration.border!.isUniform, isTrue);
      expect(decoration.border!.top.width, equals(1.0));
      expect(decoration.border!.top.color, equals(AppColors.outline));
    });

    testWidgets('applies custom border color and width', (tester) async {
      const testChild = Text('Test Content');
      const borderColor = Colors.blue;
      const borderWidth = 3.0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BorderedCardContainer(
              borderColor: borderColor,
              borderWidth: borderWidth,
              child: testChild,
            ),
          ),
        ),
      );

      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.border!.top.color, equals(borderColor));
      expect(decoration.border!.top.width, equals(borderWidth));
    });
  });

  group('HighlightedCardContainer', () {
    testWidgets('displays with highlight styling', (tester) async {
      const testChild = Text('Test Content');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HighlightedCardContainer(
              child: testChild,
            ),
          ),
        ),
      );

      expect(find.text('Test Content'), findsOneWidget);
      final container = tester.widget<Container>(find.byType(Container).first);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(AppColors.primaryContainer));
      expect(decoration.border, isNotNull);
      expect(decoration.border!.top.color, equals(AppColors.primary.withOpacity(0.2)));
    });
  });
}