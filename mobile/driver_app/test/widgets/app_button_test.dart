import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:driver_app/widgets/app_button.dart';
import 'package:driver_app/theme/app_colors.dart';

void main() {
  group('AppButton', () {
    testWidgets('displays text with default primary styling', (tester) async {
      const testText = 'Click Me';
      bool wasPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(text: testText, onPressed: () => wasPressed = true),
          ),
        ),
      );

      expect(find.text(testText), findsOneWidget);
      expect(find.byType(AppButton), findsOneWidget);
      expect(find.byType(TextButton), findsOneWidget);

      // Test button press
      await tester.tap(find.byType(AppButton));
      expect(wasPressed, isTrue);
    });

    testWidgets('applies primary variant styling', (tester) async {
      const testText = 'Primary';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton.primary(text: testText, onPressed: () {}),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(
        textButton.style?.backgroundColor?.resolve({}),
        equals(AppColors.primary),
      );

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onPrimary));
    });

    testWidgets('applies secondary variant styling', (tester) async {
      const testText = 'Secondary';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton.secondary(text: testText, onPressed: () {}),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(
        textButton.style?.backgroundColor?.resolve({}),
        equals(AppColors.surfaceVariant),
      );

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.textPrimary));
    });

    testWidgets('applies outline variant styling', (tester) async {
      const testText = 'Outline';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton.outline(text: testText, onPressed: () {}),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(
        textButton.style?.backgroundColor?.resolve({}),
        equals(Colors.transparent),
      );
      expect(
        textButton.style?.side?.resolve({})?.color,
        equals(AppColors.primary),
      );

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.primary));
    });

    testWidgets('applies destructive variant styling', (tester) async {
      const testText = 'Delete';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton.destructive(text: testText, onPressed: () {}),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(
        textButton.style?.backgroundColor?.resolve({}),
        equals(AppColors.error),
      );

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.onError));
    });

    testWidgets('applies ghost variant styling', (tester) async {
      const testText = 'Ghost';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton.ghost(text: testText, onPressed: () {}),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(
        textButton.style?.backgroundColor?.resolve({}),
        equals(Colors.transparent),
      );
      expect(textButton.style?.side, isNull);

      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.textPrimary));
    });

    testWidgets('applies different sizes', (tester) async {
      const testText = 'Size Test';

      // Test small size
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              size: AppButtonSize.small,
            ),
          ),
        ),
      );

      var sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.height, equals(32.0));

      // Test medium size
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              size: AppButtonSize.medium,
            ),
          ),
        ),
      );

      sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.height, equals(40.0));

      // Test large size
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              size: AppButtonSize.large,
            ),
          ),
        ),
      );

      sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.height, equals(48.0));
    });

    testWidgets('displays loading state correctly', (tester) async {
      const testText = 'Loading';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {}, // Should be disabled when loading
              isLoading: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text(testText), findsOneWidget);
      expect(find.byType(Row), findsOneWidget); // Icon and text in row

      // Button should be disabled when loading
      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(textButton.onPressed, isNull);
    });

    testWidgets('displays leading icon', (tester) async {
      const testText = 'With Icon';
      const testIcon = Icons.add;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              leadingIcon: testIcon,
            ),
          ),
        ),
      );

      expect(find.byIcon(testIcon), findsOneWidget);
      expect(find.text(testText), findsOneWidget);
      expect(find.byType(Row), findsOneWidget);
    });

    testWidgets('displays trailing icon', (tester) async {
      const testText = 'With Icon';
      const testIcon = Icons.arrow_forward;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              trailingIcon: testIcon,
            ),
          ),
        ),
      );

      expect(find.byIcon(testIcon), findsOneWidget);
      expect(find.text(testText), findsOneWidget);
      expect(find.byType(Row), findsOneWidget);
    });

    testWidgets('displays both leading and trailing icons', (tester) async {
      const testText = 'Both Icons';
      const leadingIcon = Icons.add;
      const trailingIcon = Icons.arrow_forward;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              leadingIcon: leadingIcon,
              trailingIcon: trailingIcon,
            ),
          ),
        ),
      );

      expect(find.byIcon(leadingIcon), findsOneWidget);
      expect(find.byIcon(trailingIcon), findsOneWidget);
      expect(find.text(testText), findsOneWidget);
    });

    testWidgets('applies full width', (tester) async {
      const testText = 'Full Width';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(text: testText, onPressed: () {}, fullWidth: true),
          ),
        ),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, equals(double.infinity));
    });

    testWidgets('applies custom width and height', (tester) async {
      const testText = 'Custom Size';
      const customWidth = 200.0;
      const customHeight = 60.0;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              width: customWidth,
              height: customHeight,
            ),
          ),
        ),
      );

      final sizedBox = tester.widget<SizedBox>(find.byType(SizedBox));
      expect(sizedBox.width, equals(customWidth));
      expect(sizedBox.height, equals(customHeight));
    });

    testWidgets('disables when onPressed is null', (tester) async {
      const testText = 'Disabled';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: null, // Disabled button
            ),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(textButton.onPressed, isNull);

      // Should have disabled colors
      final textWidget = tester.widget<Text>(find.text(testText));
      expect(textWidget.style?.color, equals(AppColors.textDisabled));
    });

    testWidgets('applies semantic label', (tester) async {
      const testText = 'Button';
      const semanticLabel = 'Action Button';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              semanticLabel: semanticLabel,
            ),
          ),
        ),
      );

      expect(find.bySemanticsLabel(semanticLabel), findsOneWidget);
    });

    testWidgets('truncates long text', (tester) async {
      const longText =
          'This is a very long button text that should be truncated';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(text: longText, onPressed: () {}),
          ),
        ),
      );

      final textWidget = tester.widget<Text>(find.byType(Text));
      expect(textWidget.maxLines, equals(1));
      expect(textWidget.overflow, equals(TextOverflow.ellipsis));
    });

    testWidgets('applies custom border radius', (tester) async {
      const testText = 'Custom Radius';
      const customRadius = BorderRadius.all(Radius.circular(20.0));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              borderRadius: customRadius,
            ),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      final shape = textButton.style?.shape?.resolve({});
      expect(shape, isA<RoundedRectangleBorder>());
      final roundedRect = shape as RoundedRectangleBorder;
      expect(roundedRect.borderRadius, equals(customRadius));
    });

    testWidgets('applies custom padding', (tester) async {
      const testText = 'Custom Padding';
      const customPadding = EdgeInsets.all(20.0);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppButton(
              text: testText,
              onPressed: () {},
              padding: customPadding,
            ),
          ),
        ),
      );

      final textButton = tester.widget<TextButton>(find.byType(TextButton));
      expect(textButton.style?.padding?.resolve({}), equals(customPadding));
    });
  });
}
