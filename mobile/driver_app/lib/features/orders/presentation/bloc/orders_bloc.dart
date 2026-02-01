import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';

// Events
abstract class OrdersEvent extends Equatable {
  const OrdersEvent();
  @override
  List<Object> get props => [];
}

class FetchOrders extends OrdersEvent {
  final String? statusFilter;
  const FetchOrders({this.statusFilter});
}

class RefreshOrders extends OrdersEvent {
  final String? statusFilter;
  const RefreshOrders({this.statusFilter});
}

// States
abstract class OrdersState extends Equatable {
  const OrdersState();
  @override
  List<Object> get props => [];
}

class OrdersInitial extends OrdersState {}

class OrdersLoading extends OrdersState {}

class OrdersLoaded extends OrdersState {
  final List<OrderEntity> orders;
  const OrdersLoaded(this.orders);
  @override
  List<Object> get props => [orders];
}

class OrdersError extends OrdersState {
  final String message;
  const OrdersError(this.message);
  @override
  List<Object> get props => [message];
}

// Bloc
class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  final OrderRepository repository;

  OrdersBloc(this.repository) : super(OrdersInitial()) {
    on<FetchOrders>(_onFetchOrders);
    on<RefreshOrders>(_onRefreshOrders);
  }

  Future<void> _onFetchOrders(FetchOrders event, Emitter<OrdersState> emit) async {
    emit(OrdersLoading());
    try {
      final orders = await repository.getOrders(statusFilter: event.statusFilter);
      emit(OrdersLoaded(orders));
    } catch (e) {
      emit(OrdersError(e.toString()));
    }
  }

  Future<void> _onRefreshOrders(RefreshOrders event, Emitter<OrdersState> emit) async {
    // Note: Usually refresh keeps the current data visible or shows a header spinner
    // For simplicity, we just reload effectively. The UI handles the RefreshIndicator spinner.
    try {
      final orders = await repository.getOrders(statusFilter: event.statusFilter);
      emit(OrdersLoaded(orders));
    } catch (e) {
      emit(OrdersError(e.toString()));
    }
  }
}
