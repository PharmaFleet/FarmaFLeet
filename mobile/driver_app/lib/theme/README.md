# Theme System Foundation

This directory contains the complete design system implementation for the PharmaFleet Driver app, built with Flutter's Material Design 3 and following the mobile app specifications.

## 📁 Files Overview

### Core Theme Files

- **`app_colors.dart`** - Complete color palette including primary, surface, semantic status colors
- **`app_spacing.dart`** - Spacing scale (4px base) with predefined EdgeInsets and SizedBox constants
- **`app_text_styles.dart`** - Typography system using Material Design 3 text styles
- **`app_theme.dart`** - Main theme configuration for light and dark themes
- **`theme_extensions.dart`** - Theme extensions for accessing custom semantic colors
- **`theme.dart`** - Barrel export file for easy imports
- **`theme_usage_example.dart`** - Example widget demonstrating theme system usage

## 🎨 Color System

### Primary Colors
- **Primary**: `#059669` (Emerald-600)
- **Surface**: `#FFFFFF` / `#F8FAFC`
- **Background**: `#F8FAFC`
- **On-Surface**: `#0F172A` (Slate-900)

### Semantic Status Colors
- **Orders**: `#3B82F6` (Blue-500)
- **Drivers**: `#10B981` (Emerald-500)
- **Payments**: `#F59E0B` (Amber-500)
- **Analytics**: `#8B5CF6` (Purple-500)
- **Delivery**: `#6366F1` (Indigo-500)
- **Failed/Cancelled**: `#EF4444` (Red-500)

## 📏 Spacing System

4px base scale:
- `xxxs`: 2px
- `xxs`: 4px
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `xxl`: 32px
- `xxxl`: 48px

Predefined padding and margin combinations:
- `AppSpacing.paddingCard`
- `AppSpacing.paddingScreen`
- `AppSpacing.paddingContent`
- `AppSpacing.paddingButton`

## ✏️ Typography System

Based on Material Design 3 text styles:
- **Display**: `displayLarge`, `displayMedium`, `displaySmall`
- **Headlines**: `headlineLarge`, `headlineMedium`, `headlineSmall`
- **Titles**: `titleLarge`, `titleMedium`, `titleSmall`
- **Body**: `bodyLarge`, `bodyMedium`, `bodySmall`
- **Labels**: `labelLarge`, `labelMedium`, `labelSmall`

Custom application-specific styles:
- `AppTextStyles.appBarTitle`
- `AppTextStyles.screenTitle`
- `AppTextStyles.cardTitle`
- `AppTextStyles.buttonText`
- `AppTextStyles.inputText`
- And many more...

## 🚀 Usage Examples

### Basic Theme Setup

```dart
import 'package:driver_app/theme/app_theme.dart';

MaterialApp(
  theme: AppTheme.light,
  darkTheme: AppTheme.dark,
  themeMode: ThemeMode.system,
  // ... other properties
)
```

### Using Colors

```dart
// Material colors
Theme.of(context).colorScheme.primary
Theme.of(context).colorScheme.surface

// Custom semantic colors
Theme.of(context).customColors.orders
Theme.of(context).customColors.drivers
Theme.of(context).customColors.success

// Using context extension (recommended)
context.customColors.payments
context.customColors.error
```

### Using Typography

```dart
Text(
  'Hello World',
  style: AppTextStyles.headlineMedium,
)

Text(
  'Description',
  style: AppTextStyles.bodyText,
)
```

### Using Spacing

```dart
// Direct spacing values
SizedBox(height: AppSpacing.md)

// Predefined spacing widgets
AppSpacing.verticalGapLG
AppSpacing.horizontalGapSM

// Predefined padding
Padding(
  padding: AppSpacing.paddingCard,
  child: child,
)
```

### Using Widgets with Theme

```dart
Card(
  child: Padding(
    padding: AppSpacing.paddingContent,
    child: Column(
      children: [
        Text(
          'Card Title',
          style: AppTextStyles.cardTitle,
        ),
        AppSpacing.verticalGapSM,
        Text(
          'Card content',
          style: AppTextStyles.bodyText,
        ),
        AppSpacing.verticalGapMD,
        ElevatedButton(
          onPressed: () {},
          child: Text('Action', style: AppTextStyles.buttonText),
        ),
      ],
    ),
  ),
)
```

## 🎯 Theme Features

### ✅ Implemented Features
- **Material Design 3** compliant theme system
- **Light and dark theme** support
- **Semantic color system** for different app contexts
- **Consistent spacing scale** based on 4px grid
- **Complete typography system** with custom text styles
- **Theme extensions** for accessing custom colors
- **RTL support** ready (text direction handled by locale)
- **Accessibility support** with proper contrast ratios
- **Responsive design** foundation with breakpoints

### 🔧 Technical Details
- **State Management**: Theme integrates seamlessly with BLoC architecture
- **Performance**: Const constructors and optimized rebuild patterns
- **Maintainability**: Centralized design tokens and clear separation of concerns
- **Scalability**: Easy to extend with new colors, styles, and spacing values

## 🧪 Testing

The theme system includes a comprehensive example widget that demonstrates all features. To test:

```dart
// Add to your widget tree for testing
ThemeUsageExample()
```

## 📱 Integration with Existing Code

The theme system is designed to work seamlessly with the existing codebase:

1. **BLoC Integration**: Theme colors work with existing state management
2. **Navigation**: Consistent navigation bar and app bar theming
3. **Forms**: Complete input field theming with proper error states
4. **Cards**: Consistent card styling across all screens
5. **Buttons**: All button variants themed properly

## 🔄 Future Enhancements

- **Dynamic theming**: Runtime color adjustments
- **Custom themes**: Additional theme variants for different user preferences
- **Animation system**: Coordinated motion design with theme-aware animations
- **Component library**: Pre-built themed components for rapid development

## 📖 Best Practices

1. **Always use theme colors**: Avoid hardcoded colors
2. **Use semantic colors**: For status indicators and context-specific UI
3. **Follow spacing scale**: Use predefined spacing values
4. **Leverage typography**: Use appropriate text styles for hierarchy
5. **Test in both themes**: Ensure UI works in light and dark modes
6. **Check accessibility**: Ensure proper contrast for all text/background combinations