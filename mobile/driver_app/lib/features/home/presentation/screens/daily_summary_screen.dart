import 'package:driver_app/theme/theme.dart';
import 'package:driver_app/widgets/widgets.dart';
import 'package:flutter/material.dart';

class DailySummaryScreen extends StatelessWidget {
  final int todayOrders;
  final int completedOrders;
  final double earnings;
  final double rating;

  const DailySummaryScreen({
    super.key,
    required this.todayOrders,
    required this.completedOrders,
    required this.earnings,
    required this.rating,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Today\'s Overview')),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingMD,
        child: Column(
          children: [
            _SummaryCard(
              title: 'Earnings',
              value: 'KWD ${earnings.toStringAsFixed(3)}',
              icon: Icons.monetization_on,
              color: context.customColors.warning,
              isLarge: true,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _SummaryCard(
                    title: 'Total Orders',
                    value: todayOrders.toString(),
                    icon: Icons.list_alt,
                    color: context.customColors.orders,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _SummaryCard(
                    title: 'Completed',
                    value: completedOrders.toString(),
                    icon: Icons.check_circle,
                    color: context.customColors.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            _SummaryCard(
              title: 'Average Rating',
              value: rating.toStringAsFixed(1),
              icon: Icons.star,
              color: context.customColors.info,
              showProgressBar: true,
              progress: rating / 5.0,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isLarge;
  final bool showProgressBar;
  final double progress;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.isLarge = false,
    this.showProgressBar = false,
    this.progress = 0.0,
  });

  @override
  Widget build(BuildContext context) {
    return CardContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: isLarge ? 32 : 24),
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                title,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            value,
            style: isLarge
                ? AppTextStyles.headlineMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  )
                : AppTextStyles.headlineSmall,
          ),
          if (showProgressBar) ...[
            const SizedBox(height: AppSpacing.sm),
            LinearProgressIndicator(
              value: progress,
              backgroundColor: color.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ],
      ),
    );
  }
}
