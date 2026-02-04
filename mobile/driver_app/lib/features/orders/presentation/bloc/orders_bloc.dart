import 'dart:io';
import 'dart:typed_data';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path_provider/path_provider.dart';

import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';

// Events
abstract class OrdersEvent extends Equatable {
  const OrdersEvent();
  @override
  List<Object?> get props => [];
}

class FetchOrders extends OrdersEvent {
  final String? statusFilter;
  const FetchOrders({this.statusFilter});
}

class RefreshOrders extends OrdersEvent {
  final String? statusFilter;
  const RefreshOrders({this.statusFilter});
}

class OrderStatusUpdateRequested extends OrdersEvent {
  final int orderId;
  final String status;
  final String? notes;
  final File? photo;
  final Uint8List? signature;
  final String? paymentMethod;
  final double? amountCollected;

  const OrderStatusUpdateRequested(
    this.orderId,
    this.status, {
    this.notes,
    this.photo,
    this.signature,
    this.paymentMethod,
    this.amountCollected,
  });

  @override
  List<Object?> get props => [orderId, status, notes, photo, signature, paymentMethod, amountCollected];
}

class BatchPickupRequested extends OrdersEvent {
  final List<int> orderIds;
  const BatchPickupRequested(this.orderIds);

  @override
  List<Object?> get props => [orderIds];
}

class BatchDeliveryRequested extends OrdersEvent {
  final List<int> orderIds;
  final List<Map<String, dynamic>>? proofs;

  const BatchDeliveryRequested(this.orderIds, {this.proofs});

  @override
  List<Object?> get props => [orderIds, proofs];
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

class OrderStatusUpdateInProgress extends OrdersState {
  final int orderId;
  const OrderStatusUpdateInProgress(this.orderId);
  @override
  List<Object> get props => [orderId];
}

class OrderStatusUpdateSuccess extends OrdersState {
  final int orderId;
  final String newStatus;
  const OrderStatusUpdateSuccess(this.orderId, this.newStatus);
  @override
  List<Object> get props => [orderId, newStatus];
}

class OrderStatusUpdateFailure extends OrdersState {
  final int orderId;
  final String message;
  const OrderStatusUpdateFailure(this.orderId, this.message);
  @override
  List<Object> get props => [orderId, message];
}

// Batch Pickup States
class BatchPickupInProgress extends OrdersState {}

class BatchPickupSuccess extends OrdersState {
  final int count;
  const BatchPickupSuccess(this.count);
  @override
  List<Object> get props => [count];
}

class BatchPickupFailure extends OrdersState {
  final String message;
  const BatchPickupFailure(this.message);
  @override
  List<Object> get props => [message];
}

// Batch Delivery States
class BatchDeliveryInProgress extends OrdersState {}

class BatchDeliverySuccess extends OrdersState {
  final int count;
  const BatchDeliverySuccess(this.count);
  @override
  List<Object> get props => [count];
}

class BatchDeliveryFailure extends OrdersState {
  final String message;
  const BatchDeliveryFailure(this.message);
  @override
  List<Object> get props => [message];
}

// Bloc
class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  final OrderRepository repository;

  OrdersBloc(this.repository) : super(OrdersInitial()) {
    on<FetchOrders>(_onFetchOrders);
    on<RefreshOrders>(_onRefreshOrders);
    on<OrderStatusUpdateRequested>(_onOrderStatusUpdateRequested);
    on<BatchPickupRequested>(_onBatchPickupRequested);
    on<BatchDeliveryRequested>(_onBatchDeliveryRequested);
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

  Future<void> _onOrderStatusUpdateRequested(
    OrderStatusUpdateRequested event,
    Emitter<OrdersState> emit,
  ) async {
    emit(OrderStatusUpdateInProgress(event.orderId));

    try {
      // If this is a delivery completion with POD files, upload them first
      String? photoUrl;
      String? signatureUrl;

      if (event.status.toLowerCase() == 'delivered') {
        // Upload photo if provided
        if (event.photo != null) {
          photoUrl = await repository.uploadFile(event.photo!.path);
        }

        // Upload signature if provided
        if (event.signature != null) {
          final tempDir = await getTemporaryDirectory();
          final signatureFile = File('${tempDir.path}/signature_${event.orderId}.png');
          await signatureFile.writeAsBytes(event.signature!);
          signatureUrl = await repository.uploadFile(signatureFile.path);
        }

        // Submit proof of delivery if we have files
        if (photoUrl != null || signatureUrl != null) {
          await repository.submitProofOfDelivery(
            event.orderId,
            photoUrl ?? '',
            signatureUrl,
          );
        }
      }

      // Update the order status
      await repository.updateOrderStatus(
        event.orderId,
        event.status,
        notes: event.notes,
      );

      emit(OrderStatusUpdateSuccess(event.orderId, event.status));
    } catch (e) {
      emit(OrderStatusUpdateFailure(event.orderId, e.toString()));
    }
  }

  Future<void> _onBatchPickupRequested(
    BatchPickupRequested event,
    Emitter<OrdersState> emit,
  ) async {
    emit(BatchPickupInProgress());

    try {
      final result = await repository.batchPickupOrders(event.orderIds);
      final count = result['picked_up'] as int? ?? event.orderIds.length;
      emit(BatchPickupSuccess(count));
    } catch (e) {
      emit(BatchPickupFailure(e.toString()));
    }
  }

  Future<void> _onBatchDeliveryRequested(
    BatchDeliveryRequested event,
    Emitter<OrdersState> emit,
  ) async {
    emit(BatchDeliveryInProgress());

    try {
      final result = await repository.batchDeliveryOrders(event.orderIds, event.proofs);
      final count = result['delivered'] as int? ?? event.orderIds.length;
      emit(BatchDeliverySuccess(count));
    } catch (e) {
      emit(BatchDeliveryFailure(e.toString()));
    }
  }
}
