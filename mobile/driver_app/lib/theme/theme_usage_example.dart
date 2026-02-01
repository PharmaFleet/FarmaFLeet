import 'package:driver_app/theme/theme.dart';
import 'package:flutter/material.dart';

/// Example widget demonstrating the theme system usage
/// This file shows how to use the new theme system in your Flutter app
class ThemeUsageExample extends StatelessWidget {
  const ThemeUsageExample({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Theme System Demo'),
        backgroundColor: Theme.of(context).colorScheme.surface,
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingScreen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Typography examples
            Text('Headline Large', style: AppTextStyles.headlineLarge),
            AppSpacing.verticalGapSM,
            Text('Headline Medium', style: AppTextStyles.headlineMedium),
            AppSpacing.verticalGapSM,
            Text('Title Medium', style: AppTextStyles.titleMedium),
            AppSpacing.verticalGapSM,
            Text('Body Medium', style: AppTextStyles.bodyMedium),
            AppSpacing.verticalGapSM,
            Text('Label Large', style: AppTextStyles.labelLarge),
            AppSpacing.verticalGapXL,

            // Color scheme examples
            Text(
              'Primary Color Examples',
              style: AppTextStyles.sectionTitle,
            ),
            AppSpacing.verticalGapMD,
            Wrap(
              spacing: AppSpacing.sm,
              children: [
                _ColorChip(
                  color: Theme.of(context).colorScheme.primary,
                  label: 'Primary',
                ),
                _ColorChip(
                  color: Theme.of(context).colorScheme.surface,
                  label: 'Surface',
                ),
                _ColorChip(
                  color: Theme.of(context).colorScheme.surface,
                  label: 'Background',
                ),
              ],
            ),
            AppSpacing.verticalGapXL,

            // Custom semantic colors examples
            Text(
              'Semantic Color Examples',
              style: AppTextStyles.sectionTitle,
            ),
            AppSpacing.verticalGapMD,
            Wrap(
              spacing: AppSpacing.sm,
              children: [
                _ColorChip(
                  color: context.customColors.orders,
                  label: 'Orders',
                ),
                _ColorChip(
                  color: context.customColors.drivers,
                  label: 'Drivers',
                ),
                _ColorChip(
                  color: context.customColors.payments,
                  label: 'Payments',
                ),
                _ColorChip(
                  color: context.customColors.analytics,
                  label: 'Analytics',
                ),
                _ColorChip(
                  color: context.customColors.delivery,
                  label: 'Delivery',
                ),
                _ColorChip(
                  color: context.customColors.failed,
                  label: 'Failed',
                ),
              ],
            ),
            AppSpacing.verticalGapXL,

            // Spacing examples
            Text(
              'Spacing Examples',
              style: AppTextStyles.sectionTitle,
            ),
            AppSpacing.verticalGapMD,
            _SpacingExample(),
            AppSpacing.verticalGapXL,

            // Button examples
            Text(
              'Button Examples',
              style: AppTextStyles.sectionTitle,
            ),
            AppSpacing.verticalGapMD,
            Wrap(
              spacing: AppSpacing.sm,
              children: [
                ElevatedButton(
                  onPressed: () {},
                  child: const Text('Elevated'),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('Text'),
                ),
                OutlinedButton(
                  onPressed: () {},
                  child: const Text('Outlined'),
                ),
              ],
            ),
            AppSpacing.verticalGapXL,

            // Card examples
            Text(
              'Card Examples',
              style: AppTextStyles.sectionTitle,
            ),
            AppSpacing.verticalGapMD,
            Card(
              child: Padding(
                padding: AppSpacing.paddingCard,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Card Title',
                      style: AppTextStyles.cardTitle,
                    ),
                    AppSpacing.verticalGapSM,
                    Text(
                      'This is a card using the theme system with proper spacing and typography.',
                      style: AppTextStyles.bodyText,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ColorChip extends StatelessWidget {
  final Color color;
  final String label;

  const _ColorChip({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Chip(
      backgroundColor: color,
      label: Text(
        label,
        style: AppTextStyles.chipText.copyWith(
          color: color.computeLuminance() > 0.5 ? Colors.black : Colors.white,
        ),
      ),
    );
  }
}

class _SpacingExample extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Spacing Scale (4px):'),
        AppSpacing.verticalGapSM,
        Row(
          children: [
            _SpacingBox(size: AppSpacing.xxxs, label: '2px'),
            AppSpacing.horizontalGapSM,
            _SpacingBox(size: AppSpacing.xs, label: '4px'),
            AppSpacing.horizontalGapSM,
            _SpacingBox(size: AppSpacing.sm, label: '8px'),
            AppSpacing.horizontalGapSM,
            _SpacingBox(size: AppSpacing.md, label: '12px'),
            AppSpacing.horizontalGapSM,
            _SpacingBox(size: AppSpacing.lg, label: '16px'),
          ],
        ),
        AppSpacing.verticalGapMD,
        Row(
          children: [
            _SpacingBox(size: AppSpacing.xl, label: '24px'),
            AppSpacing.horizontalGapSM,
            _SpacingBox(size: AppSpacing.xxl, label: '32px'),
          ],
        ),
      ],
    );
  }
}

class _SpacingBox extends StatelessWidget {
  final double size;
  final String label;

  const _SpacingBox({
    required this.size,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        AppSpacing.verticalGapXXS,
        Text(
          label,
          style: AppTextStyles.caption,
        ),
      ],
    );
  }
}