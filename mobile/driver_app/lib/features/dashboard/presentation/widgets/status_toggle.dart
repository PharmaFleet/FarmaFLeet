import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../../core/theme/app_colors.dart';

class StatusToggle extends StatelessWidget {
  final bool isAvailable;
  final ValueChanged<bool> onToggle;
  final bool isLoading;

  const StatusToggle({
    super.key,
    required this.isAvailable,
    required this.onToggle,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 0.9.sw,
      height: 60.h,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Padding(
            padding: EdgeInsets.only(left: 20.w),
            child: Text(
              isAvailable ? "You are Online" : "You are Offline",
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: isAvailable ? AppColors.success : AppColors.textSecondaryLight,
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.only(right: 8.w),
            child: Switch(
              value: isAvailable,
              onChanged: isLoading ? null : onToggle,
              activeThumbColor: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}
