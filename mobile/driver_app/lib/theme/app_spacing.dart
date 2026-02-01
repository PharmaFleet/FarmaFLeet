import 'package:flutter/widgets.dart';

/// Application spacing scale based on the design specification
/// Centralized spacing tokens for consistent layouts and gaps
class AppSpacing {
  AppSpacing._(); // Private constructor to prevent instantiation

  // Base spacing units (4px scale)
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double xxl = 32.0;

  // Additional spacing units for flexibility
  static const double xxxs = 2.0; // Half of xs
  static const double xxxl = 48.0; // 12 * 4
  static const double huge = 64.0; // 16 * 4

  // Common padding combinations
  static const EdgeInsets paddingXS = EdgeInsets.all(xs);
  static const EdgeInsets paddingSM = EdgeInsets.all(sm);
  static const EdgeInsets paddingMD = EdgeInsets.all(md);
  static const EdgeInsets paddingLG = EdgeInsets.all(lg);
  static const EdgeInsets paddingXL = EdgeInsets.all(xl);
  static const EdgeInsets paddingXXL = EdgeInsets.all(xxl);

  // Symmetric padding
  static const EdgeInsets paddingHorizontalXS = EdgeInsets.symmetric(horizontal: xs);
  static const EdgeInsets paddingHorizontalSM = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets paddingHorizontalMD = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets paddingHorizontalLG = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets paddingHorizontalXL = EdgeInsets.symmetric(horizontal: xl);

  static const EdgeInsets paddingVerticalXS = EdgeInsets.symmetric(vertical: xs);
  static const EdgeInsets paddingVerticalSM = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets paddingVerticalMD = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets paddingVerticalLG = EdgeInsets.symmetric(vertical: lg);
  static const EdgeInsets paddingVerticalXL = EdgeInsets.symmetric(vertical: xl);

  // Common asymmetric padding combinations
  static const EdgeInsets paddingCard = EdgeInsets.all(lg);
  static const EdgeInsets paddingScreen = EdgeInsets.all(lg);
  static const EdgeInsets paddingContent = EdgeInsets.symmetric(horizontal: lg, vertical: md);
  static const EdgeInsets paddingSection = EdgeInsets.symmetric(horizontal: lg, vertical: xl);
  static const EdgeInsets paddingButton = EdgeInsets.symmetric(horizontal: xl, vertical: md);

  // Margin combinations
  static const EdgeInsets marginXS = EdgeInsets.all(xs);
  static const EdgeInsets marginSM = EdgeInsets.all(sm);
  static const EdgeInsets marginMD = EdgeInsets.all(md);
  static const EdgeInsets marginLG = EdgeInsets.all(lg);
  static const EdgeInsets marginXL = EdgeInsets.all(xl);
  static const EdgeInsets marginXXL = EdgeInsets.all(xxl);

  // Symmetric margins
  static const EdgeInsets marginHorizontalXS = EdgeInsets.symmetric(horizontal: xs);
  static const EdgeInsets marginHorizontalSM = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets marginHorizontalMD = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets marginHorizontalLG = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets marginHorizontalXL = EdgeInsets.symmetric(horizontal: xl);

  static const EdgeInsets marginVerticalXS = EdgeInsets.symmetric(vertical: xs);
  static const EdgeInsets marginVerticalSM = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets marginVerticalMD = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets marginVerticalLG = EdgeInsets.symmetric(vertical: lg);
  static const EdgeInsets marginVerticalXL = EdgeInsets.symmetric(vertical: xl);

  // Common asymmetric margin combinations
  static const EdgeInsets marginCard = EdgeInsets.all(lg);
  static const EdgeInsets marginScreen = EdgeInsets.all(lg);
  static const EdgeInsets marginContent = EdgeInsets.symmetric(horizontal: lg, vertical: md);
  static const EdgeInsets marginSection = EdgeInsets.symmetric(horizontal: lg, vertical: xl);
  static const EdgeInsets marginBottom = EdgeInsets.only(bottom: lg);

  // Gap spacing for rows and columns
  static const SizedBox gapXXXS = SizedBox(width: xxxs, height: xxxs);
  static const SizedBox gapXXS = SizedBox(width: xs, height: xs);
  static const SizedBox gapXS = SizedBox(width: xs, height: xs);
  static const SizedBox gapSM = SizedBox(width: sm, height: sm);
  static const SizedBox gapMD = SizedBox(width: md, height: md);
  static const SizedBox gapLG = SizedBox(width: lg, height: lg);
  static const SizedBox gapXL = SizedBox(width: xl, height: xl);
  static const SizedBox gapXXL = SizedBox(width: xxl, height: xxl);
  static const SizedBox gapXXXL = SizedBox(width: xxxl, height: xxxl);
  static const SizedBox gapHuge = SizedBox(width: huge, height: huge);

  // Specific directional gaps
  static const SizedBox horizontalGapXXXS = SizedBox(width: xxxs);
  static const SizedBox horizontalGapXXS = SizedBox(width: xs);
  static const SizedBox horizontalGapXS = SizedBox(width: xs);
  static const SizedBox horizontalGapSM = SizedBox(width: sm);
  static const SizedBox horizontalGapMD = SizedBox(width: md);
  static const SizedBox horizontalGapLG = SizedBox(width: lg);
  static const SizedBox horizontalGapXL = SizedBox(width: xl);
  static const SizedBox horizontalGapXXL = SizedBox(width: xxl);

  static const SizedBox verticalGapXXXS = SizedBox(height: xxxs);
  static const SizedBox verticalGapXXS = SizedBox(height: xs);
  static const SizedBox verticalGapXS = SizedBox(height: xs);
  static const SizedBox verticalGapSM = SizedBox(height: sm);
  static const SizedBox verticalGapMD = SizedBox(height: md);
  static const SizedBox verticalGapLG = SizedBox(height: lg);
  static const SizedBox verticalGapXL = SizedBox(height: xl);
  static const SizedBox verticalGapXXL = SizedBox(height: xxl);

  // Border radius values (8-12px as specified)
  static const BorderRadius radiusXS = BorderRadius.all(Radius.circular(4.0));
  static const BorderRadius radiusSM = BorderRadius.all(Radius.circular(8.0));
  static const BorderRadius radiusMD = BorderRadius.all(Radius.circular(10.0));
  static const BorderRadius radiusLG = BorderRadius.all(Radius.circular(12.0));
  static const BorderRadius radiusXL = BorderRadius.all(Radius.circular(16.0));
  static const BorderRadius radiusFull = BorderRadius.all(Radius.circular(999.0));

  // Common border radius combinations
  static const BorderRadius radiusCard = radiusMD;
  static const BorderRadius radiusButton = radiusSM;
  static const BorderRadius radiusChip = radiusFull;
  static const BorderRadius radiusDialog = radiusLG;

  // Border radius for specific corners
  static const BorderRadius radiusTop = BorderRadius.only(
    topLeft: Radius.circular(lg),
    topRight: Radius.circular(lg),
  );

  static const BorderRadius radiusBottom = BorderRadius.only(
    bottomLeft: Radius.circular(lg),
    bottomRight: Radius.circular(lg),
  );
}