import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:hive/hive.dart';

import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/dashboard/data/repositories/dashboard_repository_impl.dart';
import '../../features/dashboard/domain/repositories/dashboard_repository.dart';
import '../../features/dashboard/presentation/bloc/dashboard_bloc.dart';
import '../../features/notifications/data/repositories/notification_repository_impl.dart';
import '../../features/notifications/domain/repositories/notification_repository.dart';
import '../../features/notifications/presentation/bloc/notification_bloc.dart';
import '../../features/orders/data/repositories/order_repository_impl.dart';
import '../../features/orders/domain/repositories/order_repository.dart';
import '../../features/orders/presentation/bloc/orders_bloc.dart';
import '../../features/profile/data/repositories/profile_repository.dart';
import '../../features/profile/presentation/bloc/profile_bloc.dart';
import '../api/api_client.dart';
import '../constants/api_constants.dart';
import '../models/location_model.dart';
import '../network/dio_client.dart';
import '../services/location_service.dart';
import '../services/notification_service.dart';
import '../services/token_storage_service.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // Features - Auth
  // Blocs
  sl.registerFactory(() => AuthBloc(sl(), sl()));
  sl.registerFactory(() => DashboardBloc(sl(), sl()));
  sl.registerFactory(() => OrdersBloc(sl()));
  sl.registerFactory(() => ProfileBloc(sl()));
  sl.registerFactory(() => NotificationBloc(sl()));

  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(dio: sl(), storage: sl()),
  );
  sl.registerLazySingleton<DashboardRepository>(() => DashboardRepositoryImpl(sl()));
  sl.registerLazySingleton<OrderRepository>(() => OrderRepositoryImpl(sl()));
  sl.registerLazySingleton(() => ProfileRepository(sl()));
  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepositoryImpl(sl()),
  );

  // Core
  sl.registerLazySingleton(() => const FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
      ));

  // Services
  sl.registerLazySingleton(() => TokenStorageService(storage: sl()));
  sl.registerLazySingleton(() => NotificationService());

  // Location & API
  sl.registerLazySingleton(() => ApiClient(
        baseUrl: ApiConstants.baseUrl,
        secureStorage: sl(),
      ));

  final locationBox = await Hive.openBox<LocationUpdateModel>('location_updates');
  sl.registerSingleton<Box<LocationUpdateModel>>(locationBox);

  sl.registerLazySingleton(() => LocationService(
        apiClient: sl(),
        locationBox: sl(),
      ));

  // Network
  sl.registerLazySingleton(() => DioClient(sl()));

  sl.registerLazySingleton<Dio>(() => sl<DioClient>().dio);
}
