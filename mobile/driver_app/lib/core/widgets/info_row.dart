import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../theme/app_colors.dart';

class InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool isBold;

  const InfoRow({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: EdgeInsets.only(bottom: 8.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                    fontWeight: isBold ? FontWeight.w600 : FontWeight.normal,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
