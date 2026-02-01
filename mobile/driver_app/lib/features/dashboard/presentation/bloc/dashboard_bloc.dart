import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

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
  const DashboardStatusToggled(this.isAvailable);
  @override
  List<Object?> get props => [isAvailable];
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

  const DashboardState({
    this.status = DriverStatus.offline,
    this.isAvailable = false,
    this.currentLocation,
    this.errorMessage,
  });

  DashboardState copyWith({
    DriverStatus? status,
    bool? isAvailable,
    LatLng? currentLocation,
    String? errorMessage,
  }) {
    return DashboardState(
      status: status ?? this.status,
      isAvailable: isAvailable ?? this.isAvailable,
      currentLocation: currentLocation ?? this.currentLocation,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, isAvailable, currentLocation, errorMessage];
}

// Bloc
class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardRepository repository;

  DashboardBloc(this.repository) : super(const DashboardState()) {
    on<DashboardInit>(_onInit);
    on<DashboardStatusToggled>(_onStatusToggled);
    on<DashboardLocationUpdated>(_onLocationUpdated);
  }

  Future<void> _onInit(DashboardInit event, Emitter<DashboardState> emit) async {
    // In a real app, fetch initial status from backend here
    // For now, we default to offline/false or persist from previous session if possible
  }

  Future<void> _onStatusToggled(DashboardStatusToggled event, Emitter<DashboardState> emit) async {
    emit(state.copyWith(status: DriverStatus.loading));
    try {
      await repository.updateStatus(event.isAvailable);
      emit(state.copyWith(
        status: event.isAvailable ? DriverStatus.online : DriverStatus.offline,
        isAvailable: event.isAvailable,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: DriverStatus.error,
        errorMessage: "Failed to update status",
      ));
      // Revert status after error if needed, or keep previous
    }
  }

  Future<void> _onLocationUpdated(DashboardLocationUpdated event, Emitter<DashboardState> emit) async {
    emit(state.copyWith(currentLocation: event.location));
    // Ideally usage of debounce here to not spam API
    try {
        await repository.updateLocation(event.location.latitude, event.location.longitude);
    } catch (_) {
        // Silent fail for location updates
    }
  }
}
