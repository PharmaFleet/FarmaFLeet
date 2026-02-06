# AGENTS.md - Development Guide for PharmaFleet Driver App

## Project Overview
This is a Flutter driver application for pharmaceutical delivery with BLoC state management, Material Design 3 theming, and multi-language support (English/Arabic).

## Commands

### Flutter Commands
Working directory: `E:\Py\Delivery-System-III\mobile\driver_app`

```bash
# Get dependencies
flutter pub get

# Run the app
flutter run

# Run on specific device
flutter run -d chrome        # Web
flutter run -d android       # Android
flutter run -d ios           # iOS

# Build for production
flutter build apk            # Android APK
flutter build ios            # iOS
flutter build web            # Web
```

### Testing Commands
```bash
# Run all tests
flutter test

# Run single test file
flutter test test/widgets/app_button_test.dart

# Run tests with coverage
flutter test --coverage

# Run tests in watch mode
flutter test --watch

# Run integration tests
flutter test integration_test/
```

### Code Quality Commands
```bash
# Analyze code for issues
flutter analyze

# Format code
dart format .

# Format specific file
dart format lib/widgets/app_button.dart

# Fix imports automatically
dart fix --apply
```

## Code Style Guidelines

### Import Organization
```dart
// Flutter imports first
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

// Third-party packages
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';

// Internal imports (use relative paths)
import 'package:driver_app/core/network/dio_client.dart';
import 'package:driver_app/features/auth/domain/auth_repository.dart';
import 'package:driver_app/widgets/widgets.dart';
```

### Naming Conventions
- **Files**: snake_case (e.g., `auth_bloc.dart`, `order_service.dart`)
- **Classes**: PascalCase (e.g., `AuthBloc`, `OrderService`)
- **Variables/Methods**: camelCase (e.g., `orderService`, `fetchOrders()`)
- **Constants**: PascalCase for static const (e.g., `ApiConstants.baseUrl`)
- **Private members**: prefix with `_` (e.g., `_authRepository`)

### Project Structure
```
lib/
├── core/                   # Shared utilities and services
│   ├── constants/          # API constants, app constants
│   ├── network/            # HTTP clients, interceptors
│   └── services/           # Location, storage, sync services
├── features/               # Feature-based architecture
│   └── [feature]/
│       ├── data/           # Data sources, DTOs, services
│       ├── domain/         # Repositories, entities, use cases
│       └── presentation/   # BLoCs, screens, widgets
├── theme/                  # Design system and theming
├── widgets/                # Reusable UI components
└── l10n/                   # Internationalization
```

### State Management (BLoC Pattern)
```dart
// Events - represent user actions
abstract class AuthEvent extends Equatable {
  @override
  List<Object> get props => [];
}

class AuthLoginRequested extends AuthEvent {
  final String username;
  final String password;
  
  AuthLoginRequested(this.username, this.password);
  
  @override
  List<Object> get props => [username, password];
}

// States - represent UI states
abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthLoading extends AuthState {}

class AuthFailure extends AuthState {
  final String error;
  
  AuthFailure(this.error);
  
  @override
  List<Object?> get props => [error];
}

// BLoC implementation
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;
  
  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<AuthLoginRequested>(_onLoginRequested);
  }
  
  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await _authRepository.login(event.username, event.password);
      emit(AuthAuthenticated());
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }
}
```

### Error Handling
```dart
// Use try-catch with proper error messages
try {
  final result = await _repository.fetchData();
  emit(DataLoaded(result));
} on NetworkException catch (e) {
  emit(DataFailure('Network error: ${e.message}'));
} catch (e) {
  emit(DataFailure('Unexpected error: ${e.toString()}'));
}

// Always handle null cases gracefully
final user = data['user'] as Map<String, dynamic>?;
final name = user?['name'] as String? ?? 'Unknown';
```

### Widget Development
```dart
// Use const constructors where possible
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  
  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      child: isLoading 
        ? const CircularProgressIndicator()
        : Text(text),
    );
  }
}

// Use theme system for styling
Container(
  padding: AppSpacing.paddingCard,
  decoration: BoxDecoration(
    color: Theme.of(context).colorScheme.surface,
    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.1),
        blurRadius: 4,
        offset: const Offset(0, 2),
      ),
    ],
  ),
  child: Text(
    title,
    style: AppTextStyles.titleMedium,
  ),
)
```

### Testing Guidelines
```dart
// Widget tests should follow this pattern:
group('AppButton Tests', () {
  testWidgets('renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppButton(
            text: 'Test Button',
            onPressed: () {},
          ),
        ),
      ),
    );
    
    expect(find.text('Test Button'), findsOneWidget);
    expect(find.byType(AppButton), findsOneWidget);
  });

  testWidgets('calls onPressed when tapped', (WidgetTester tester) async {
    bool wasPressed = false;
    
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppButton(
            text: 'Test Button',
            onPressed: () => wasPressed = true,
          ),
        ),
      ),
    );
    
    await tester.tap(find.byType(AppButton));
    expect(wasPressed, true);
  });
});
```

### Accessibility Guidelines
- Add semantic labels for screen readers
- Ensure minimum touch targets (44x44 points)
- Support high contrast modes
- Use proper focus management
- Test with TalkBack/VoiceOver

### Performance Guidelines
- Use const widgets and constructors
- Implement proper dispose patterns
- Use ListView.builder for long lists
- Optimize image loading and caching
- Profile with Flutter DevTools

### Localization Support
- Use `AppLocalizations.of(context)!` for strings
- Test both English and Arabic locales
- Support RTL layout for Arabic
- Avoid hardcoded strings in UI

## Theme System Usage
```dart
// Access theme colors
Theme.of(context).colorScheme.primary
context.customColors.orders  // Custom semantic colors

// Use typography
AppTextStyles.headlineMedium
Theme.of(context).textTheme.bodyLarge

// Apply spacing
AppSpacing.md  // 16px
AppSpacing.paddingCard
```

## Architecture Rules
1. Follow feature-based folder structure
2. Use BLoC for state management
3. Keep business logic separate from UI
4. Use repository pattern for data access
5. Implement proper error handling
6. Write unit and widget tests for new features
7. Use the theme system for all styling
8. Follow accessibility best practices

## Git Workflow
- Create feature branches from main
- Write descriptive commit messages
- Ensure tests pass before pushing
- Run `flutter analyze` and fix issues
- Request code review for PRs