import 'package:driver_app/core/services/location_service.dart';
import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:driver_app/features/orders/data/order_service.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

// Home Dashboard Events
abstract class HomeEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class HomeLoadRequested extends HomeEvent {}

class HomeRefreshRequested extends HomeEvent {}

class HomeOnlineStatusChanged extends HomeEvent {
  final bool isOnline;

  HomeOnlineStatusChanged(this.isOnline);

  @override
  List<Object?> get props => [isOnline];
}

class HomeStatsRefreshRequested extends HomeEvent {}

// Home Dashboard States
abstract class HomeState extends Equatable {
  @override
  List<Object?> get props => [];
}

class HomeInitial extends HomeState {}

class HomeLoading extends HomeState {}

class HomeLoaded extends HomeState {
  final bool isOnline;
  final HomeStats stats;
  final List<OrderModel> recentOrders;
  final List<ActivityItem> recentActivities;

  HomeLoaded({
    required this.isOnline,
    required this.stats,
    required this.recentOrders,
    required this.recentActivities,
  });

  HomeLoaded copyWith({
    bool? isOnline,
    HomeStats? stats,
    List<OrderModel>? recentOrders,
    List<ActivityItem>? recentActivities,
  }) {
    return HomeLoaded(
      isOnline: isOnline ?? this.isOnline,
      stats: stats ?? this.stats,
      recentOrders: recentOrders ?? this.recentOrders,
      recentActivities: recentActivities ?? this.recentActivities,
    );
  }

  @override
  List<Object?> get props => [isOnline, stats, recentOrders, recentActivities];
}

class HomeError extends HomeState {
  final String message;
  final String? action;

  HomeError(this.message, {this.action});

  @override
  List<Object?> get props => [message, action];
}

// Home Statistics Data
class HomeStats extends Equatable {
  final int todayOrders;
  final int completedOrders;
  final double earnings;
  final double rating;
  final int activeDeliveries;

  const HomeStats({
    required this.todayOrders,
    required this.completedOrders,
    required this.earnings,
    required this.rating,
    required this.activeDeliveries,
  });

  @override
  List<Object?> get props => [todayOrders, completedOrders, earnings, rating, activeDeliveries];
}

// Activity Item for Recent Activity
class ActivityItem extends Equatable {
  final String id;
  final String title;
  final String description;
  final DateTime timestamp;
  final ActivityType type;
  final Map<String, dynamic>? data;

  const ActivityItem({
    required this.id,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.type,
    this.data,
  });

  @override
  List<Object?> get props => [id, title, description, timestamp, type, data];
}

enum ActivityType {
  orderAssigned,
  orderPickedUp,
  orderDelivered,
  orderCancelled,
  paymentReceived,
  locationUpdated,
}

// Home BLoC Implementation
class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final OrderService _orderService;
  final LocationService _locationService;

  HomeBloc(this._orderService, this._locationService) : super(HomeInitial()) {
    on<HomeLoadRequested>(_onLoadRequested);
    on<HomeRefreshRequested>(_onRefreshRequested);
    on<HomeOnlineStatusChanged>(_onOnlineStatusChanged);
    on<HomeStatsRefreshRequested>(_onStatsRefreshRequested);
  }

  Future<void> _onLoadRequested(
    HomeLoadRequested event,
    Emitter<HomeState> emit,
  ) async {
    emit(HomeLoading());
    try {
      final results = await Future.wait([
        _orderService.getMyOrders(),
        _loadStats(),
      ]);

      final orders = results[0] as List<OrderModel>;
      final stats = results[1] as HomeStats;

      // Filter recent orders (last 24 hours)
      final now = DateTime.now();
      final recentOrders = orders.where((order) {
        return now.difference(order.createdAt).inHours <= 24;
      }).toList();

      // Generate activity items from recent orders
      final activities = _generateActivityItems(recentOrders);

      emit(HomeLoaded(
        isOnline: _locationService.isTracking,
        stats: stats,
        recentOrders: recentOrders.take(3).toList(), // Show only last 3
        recentActivities: activities.take(5).toList(), // Show only last 5
      ));
    } catch (e) {
      emit(HomeError('Failed to load home data: ${e.toString()}'));
    }
  }

  Future<void> _onRefreshRequested(
    HomeRefreshRequested event,
    Emitter<HomeState> emit,
  ) async {
    if (state is HomeLoaded) {
      final currentState = state as HomeLoaded;
      try {
        final results = await Future.wait([
          _orderService.getMyOrders(),
          _loadStats(),
        ]);

        final orders = results[0] as List<OrderModel>;
        final stats = results[1] as HomeStats;

        // Filter recent orders (last 24 hours)
        final now = DateTime.now();
        final recentOrders = orders.where((order) {
          return now.difference(order.createdAt).inHours <= 24;
        }).toList();

        // Generate activity items from recent orders
        final activities = _generateActivityItems(recentOrders);

        emit(currentState.copyWith(
          stats: stats,
          recentOrders: recentOrders.take(3).toList(),
          recentActivities: activities.take(5).toList(),
        ));
      } catch (e) {
        emit(HomeError('Failed to refresh data: ${e.toString()}'));
      }
    }
  }

  Future<void> _onOnlineStatusChanged(
    HomeOnlineStatusChanged event,
    Emitter<HomeState> emit,
  ) async {
    if (state is HomeLoaded) {
      final currentState = state as HomeLoaded;
      emit(currentState.copyWith(isOnline: event.isOnline));
      
      // If going online, refresh the data
      if (event.isOnline) {
        add(HomeStatsRefreshRequested());
      }
    }
  }

  Future<void> _onStatsRefreshRequested(
    HomeStatsRefreshRequested event,
    Emitter<HomeState> emit,
  ) async {
    if (state is HomeLoaded) {
      final currentState = state as HomeLoaded;
      try {
        final stats = await _loadStats();
        emit(currentState.copyWith(stats: stats));
      } catch (e) {
        // Don't change state on stats refresh failure, just log
        debugPrint('Failed to refresh stats: $e');
      }
    }
  }

  Future<HomeStats> _loadStats() async {
    try {
      final orders = await _orderService.getMyOrders();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final tomorrow = today.add(const Duration(days: 1));

      // Calculate today's stats
      final todayOrders = orders.where((order) {
        return order.createdAt.isAfter(today) && order.createdAt.isBefore(tomorrow);
      }).toList();

      final completedOrders = todayOrders.where((order) =>
        order.status == 'delivered'
      ).length;

      final activeDeliveries = orders.where((order) =>
        order.status == 'assigned' ||
        order.status == 'picked_up' ||
        order.status == 'in_transit'
      ).length;

      // Calculate earnings (sum of delivered orders)
      final earnings = orders
          .where((order) => order.status == 'delivered')
          .fold<double>(0.0, (sum, order) => sum + order.totalAmount);

      // Rating would typically come from a separate service
      const rating = 4.8; // Placeholder

      return HomeStats(
        todayOrders: todayOrders.length,
        completedOrders: completedOrders,
        earnings: earnings,
        rating: rating,
        activeDeliveries: activeDeliveries,
      );
    } catch (e) {
      // Return default stats on error
      return const HomeStats(
        todayOrders: 0,
        completedOrders: 0,
        earnings: 0.0,
        rating: 5.0,
        activeDeliveries: 0,
      );
    }
  }

  List<ActivityItem> _generateActivityItems(List<OrderModel> orders) {
    final activities = <ActivityItem>[];

    for (final order in orders) {
      // Order assigned activity
      activities.add(ActivityItem(
        id: '${order.id}_assigned',
        title: 'New Order Assigned',
        description: 'Order #${order.salesOrderNumber ?? order.id} has been assigned to you',
        timestamp: order.createdAt,
        type: ActivityType.orderAssigned,
        data: {'orderId': order.id, 'orderNumber': order.salesOrderNumber ?? '${order.id}'},
      ));

      // Add other activity items based on order status
      if (order.status == 'delivered') {
        activities.add(ActivityItem(
          id: '${order.id}_delivered',
          title: 'Order Delivered',
          description: 'Order #${order.salesOrderNumber ?? order.id} has been delivered successfully',
          timestamp: order.createdAt, // Would use actual delivery time in real app
          type: ActivityType.orderDelivered,
          data: {'orderId': order.id, 'orderNumber': order.salesOrderNumber ?? '${order.id}'},
        ));
      }
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return activities;
  }
}