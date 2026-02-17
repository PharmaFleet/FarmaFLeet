import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/services/location_service.dart';
import '../../../../core/services/token_storage_service.dart';
import '../../domain/repositories/dashboard_repository.dart';

// Events
abstract class DashboardEvent extends Equatable {
  const DashboardEvent();
  @override
  List<Object?> get props => [];
}

class DashboardInit extends DashboardEvent {}

class DashboardStatusToggled extends DashboardEvent {
  final bool isAvailable;
  final String? driverId;
  const DashboardStatusToggled(this.isAvailable, {this.driverId});
  @override
  List<Object?> get props => [isAvailable, driverId];
}

class DashboardLocationUpdated extends DashboardEvent {
  final LatLng location;
  const DashboardLocationUpdated(this.location);
  @override
  List<Object?> get props => [location];
}

// States
enum DriverStatus { offline, online, loading, error }

class DashboardState extends Equatable {
  final DriverStatus status;
  final bool isAvailable;
  final LatLng? currentLocation;
  final String? errorMessage;
  final String? driverId;

  const DashboardState({
    this.status = DriverStatus.offline,
    this.isAvailable = false,
    this.currentLocation,
    this.errorMessage,
    this.driverId,
  });

  DashboardState copyWith({
    DriverStatus? status,
    bool? isAvailable,
    LatLng? currentLocation,
    String? errorMessage,
    String? driverId,
  }) {
    return DashboardState(
      status: status ?? this.status,
      isAvailable: isAvailable ?? this.isAvailable,
      currentLocation: currentLocation ?? this.currentLocation,
      errorMessage: errorMessage,
      driverId: driverId ?? this.driverId,
    );
  }

  @override
  List<Object?> get props => [status, isAvailable, currentLocation, errorMessage, driverId];
}

// Bloc
class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardRepository repository;
  final LocationService locationService;

  DashboardBloc(this.repository, this.locationService) : super(const DashboardState()) {
    on<DashboardInit>(_onInit);
    on<DashboardStatusToggled>(_onStatusToggled);
    on<DashboardLocationUpdated>(_onLocationUpdated);
  }

  Future<void> _onInit(DashboardInit event, Emitter<DashboardState> emit) async {
    // Restore persisted online status
    try {
      final tokenStorage = di.sl<TokenStorageService>();
      final wasOnline = await tokenStorage.getOnlineStatus();
      final savedDriverId = await tokenStorage.getDriverId();

      if (wasOnline && savedDriverId != null) {
        debugPrint('[DashboardBloc] Restoring online status for driver: $savedDriverId');
        // Start location tracking with saved driver ID
        await locationService.startTracking(savedDriverId);
        await locationService.syncPendingLocations();

        emit(state.copyWith(
          status: DriverStatus.online,
          isAvailable: true,
          driverId: savedDriverId,
        ));
      }
    } catch (e) {
      debugPrint('[DashboardBloc] Error restoring online status: $e');
    }
  }

  Future<void> _onStatusToggled(DashboardStatusToggled event, Emitter<DashboardState> emit) async {
    emit(state.copyWith(status: DriverStatus.loading));
    final tokenStorage = di.sl<TokenStorageService>();

    try {
      final user = await repository.updateStatus(event.isAvailable);
      final driverId = user.id.toString();

      if (event.isAvailable) {
        await locationService.startTracking(driverId);
        // Persist online status
        await tokenStorage.saveOnlineStatus(true);
        await tokenStorage.saveDriverId(driverId);
      } else {
        await locationService.stopTrackingAndClear();
        // Clear persisted status
        await tokenStorage.clearOnlineStatus();
        await tokenStorage.clearDriverId();
      }

      emit(state.copyWith(
        status: event.isAvailable ? DriverStatus.online : DriverStatus.offline,
        isAvailable: event.isAvailable,
        driverId: event.isAvailable ? driverId : null,
      ));
    } catch (e) {
      // Fallback: if going online fails but we have a driver ID, still start local tracking
      if (event.isAvailable && event.driverId != null) {
        debugPrint('[DashboardBloc] Backend failed, starting local tracking for: ${event.driverId}');
        await locationService.startTracking(event.driverId!);
        await tokenStorage.saveOnlineStatus(true);
        await tokenStorage.saveDriverId(event.driverId!);

        emit(state.copyWith(
          status: DriverStatus.online,
          isAvailable: true,
          driverId: event.driverId,
        ));
      } else {
        emit(state.copyWith(
          status: DriverStatus.error,
          errorMessage: "Failed to update status",
        ));
      }
    }
  }

  Future<void> _onLocationUpdated(DashboardLocationUpdated event, Emitter<DashboardState> emit) async {
    emit(state.copyWith(currentLocation: event.location));
    try {
        await repository.updateLocation(event.location.latitude, event.location.longitude);
    } catch (_) {
        // Silent fail for location updates
    }
  }
}
