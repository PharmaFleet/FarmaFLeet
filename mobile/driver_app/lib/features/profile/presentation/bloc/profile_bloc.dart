import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/profile_repository.dart';
import 'profile_event.dart';
import 'profile_state.dart';

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository _repository;

  ProfileBloc(this._repository) : super(ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<RefreshProfile>(_onRefreshProfile);
  }

  Future<void> _onLoadProfile(
    LoadProfile event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileLoading());
    try {
      final data = await _repository.getDriverProfile();
      emit(_mapDataToState(data));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  Future<void> _onRefreshProfile(
    RefreshProfile event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      final data = await _repository.getDriverProfile();
      emit(_mapDataToState(data));
    } catch (e) {
      emit(ProfileError(e.toString()));
    }
  }

  ProfileLoaded _mapDataToState(Map<String, dynamic> data) {
    final user = data['user'] as Map<String, dynamic>?;
    final warehouse = data['warehouse'] as Map<String, dynamic>?;

    // Parse vehicle_info which may contain plate and type separated by a delimiter
    // or just store a general vehicle description
    final vehicleInfo = data['vehicle_info'] as String?;
    String? vehiclePlate;
    String? vehicleType;

    if (vehicleInfo != null && vehicleInfo.isNotEmpty) {
      // Check if vehicle_info contains a separator (e.g., "ABC-123 | Van")
      if (vehicleInfo.contains('|')) {
        final parts = vehicleInfo.split('|').map((e) => e.trim()).toList();
        vehiclePlate = parts.isNotEmpty ? parts[0] : null;
        vehicleType = parts.length > 1 ? parts[1] : null;
      } else {
        // Just treat the whole string as vehicle info (plate)
        vehiclePlate = vehicleInfo;
      }
    }

    return ProfileLoaded(
      fullName: user?['full_name'] ?? 'Driver',
      email: user?['email'] ?? '',
      phone: user?['phone'],
      vehiclePlate: vehiclePlate,
      vehicleType: vehicleType,
      warehouseName: warehouse?['name'],
      isOnline: data['is_available'] ?? false,
      totalDeliveries: data['total_deliveries'] ?? 0,
      rating: (data['rating'] as num?)?.toDouble(),
    );
  }
}
