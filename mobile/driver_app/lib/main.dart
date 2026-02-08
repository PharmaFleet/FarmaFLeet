import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'config/routes/app_router.dart';
import 'core/config/app_config.dart';
import 'core/di/injection_container.dart' as di;
import 'core/models/location_model.dart';
import 'core/network/dio_client.dart';
import 'core/services/background_service.dart';
import 'core/services/navigation_service.dart';
import 'core/services/notification_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

Future<void> _initializeApp() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await Hive.initFlutter();
  Hive.registerAdapter(LocationUpdateModelAdapter());
  await di.init();

  // Initialize Background Service for location tracking when app is minimized
  await initializeBackgroundService();

  // Initialize Notification Service (Fire and forget, or await if critical)
  di.sl<NotificationService>().initialize();

  // global error handling for 401
  final dioClient = di.sl<DioClient>();
  dioClient.onUnauthorized = () {
    di.sl<AuthBloc>().add(AuthLogoutRequested());
  };
}

void main() async {
  // Check if Sentry DSN is provided and not empty
  const sentryDsn = AppConfig.sentryDsn;
  if (sentryDsn.isNotEmpty) {
    await SentryFlutter.init(
      (options) {
        options.dsn = sentryDsn;
        options.environment = AppConfig.sentryEnvironment;
        options.tracesSampleRate = 0.1;
      },
      appRunner: () async {
        await _initializeApp();
        runApp(const DriverApp());
      },
    );
  } else {
    // No Sentry DSN, run app directly
    await _initializeApp();
    runApp(const DriverApp());
  }
}

class DriverApp extends StatelessWidget {
  const DriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => di.sl<AuthBloc>()..add(AuthCheckRequested()),
      child: Builder(builder: (context) {
        // AppRouter needs the AuthBloc instance to listen to stream
        final appRouter = AppRouter(context.read<AuthBloc>());

        // Set the router on NavigationService for notification navigation
        di.sl<NavigationService>().setRouter(appRouter.router);

        return ScreenUtilInit(
          designSize: const Size(375, 812), // iPhone 13/X design size
          minTextAdapt: true,
          splitScreenMode: true,
          builder: (context, child) {
            return MaterialApp.router(
              title: 'PharmaFleet Driver',
              debugShowCheckedModeBanner: false,
              
              // Theme Configuration
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: ThemeMode.system, // Supports System Dark Mode
              
              // Routing
              routerConfig: appRouter.router,
            );
          },
        );
      }),
    );
  }
}
