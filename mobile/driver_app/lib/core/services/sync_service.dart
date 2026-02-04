import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:driver_app/core/services/local_database_service.dart';
import 'package:driver_app/features/orders/data/order_service.dart';
import 'package:driver_app/features/orders/domain/repositories/order_repository.dart';
import 'package:logger/logger.dart';

class SyncService {
  final LocalDatabaseService _localDb;
  final OrderService _orderService;
  final OrderRepository? _orderRepository;
  final Logger _logger = Logger();

  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  bool _isSyncing = false;

  SyncService(this._localDb, this._orderService, {OrderRepository? orderRepository})
      : _orderRepository = orderRepository;

  void startMonitoring() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      result,
    ) {
      final hasConnection = result != ConnectivityResult.none;
      if (hasConnection && !_isSyncing) {
        syncPendingActions();
      }
    });
  }

  void stopMonitoring() {
    _connectivitySubscription?.cancel();
  }

  Future<bool> hasConnection() async {
    final result = await Connectivity().checkConnectivity();
    return result != ConnectivityResult.none;
  }

  Future<void> syncPendingActions() async {
    if (_isSyncing) {
      return;
    }

    final isOnline = await hasConnection();
    if (!isOnline) {
      return;
    }

    _isSyncing = true;
    _logger.i('Starting sync of pending actions...');

    try {
      final actions = _localDb.getPendingSyncActions();

      for (final action in actions) {
        try {
          await _processAction(action);
          await _localDb.removeSyncAction(action.id);
          _logger.i(
            'Synced action: ${action.type} for order ${action.orderId}',
          );
        } catch (e) {
          _logger.e('Failed to sync action ${action.id}: $e');
          // Keep in queue for retry
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _processAction(SyncAction action) async {
    switch (action.type) {
      case 'status_update':
        await _orderService.updateOrderStatus(
          action.orderId,
          action.payload['status'],
        );
        break;
      case 'delivery_complete':
        await _orderService.completeDelivery(
          action.orderId,
          photoPath: action.payload['photoPath'],
          notes: action.payload['notes'],
        );
        break;
      case 'rejection':
        await _orderService.updateOrderStatus(action.orderId, 'cancelled');
        break;
      case 'batch_pickup':
        if (_orderRepository != null) {
          await _orderRepository.batchPickupOrders(
            List<int>.from(action.payload['order_ids']),
          );
        } else {
          _logger.w('OrderRepository not available for batch_pickup');
          throw Exception('OrderRepository not configured for batch operations');
        }
        break;
      case 'batch_delivery':
        if (_orderRepository != null) {
          await _orderRepository.batchDeliveryOrders(
            List<int>.from(action.payload['order_ids']),
            action.payload['proofs'] != null
                ? List<Map<String, dynamic>>.from(action.payload['proofs'])
                : null,
          );
        } else {
          _logger.w('OrderRepository not available for batch_delivery');
          throw Exception('OrderRepository not configured for batch operations');
        }
        break;
    }
  }

  Future<void> queueStatusUpdate(int orderId, String status) async {
    final action = SyncAction(
      id: '',
      type: 'status_update',
      orderId: orderId,
      payload: {'status': status},
      createdAt: DateTime.now(),
    );
    await _localDb.addToSyncQueue(action);

    // Try immediate sync
    syncPendingActions();
  }

  Future<void> queueDeliveryComplete(
    int orderId, {
    String? photoPath,
    String? notes,
  }) async {
    final action = SyncAction(
      id: '',
      type: 'delivery_complete',
      orderId: orderId,
      payload: {
        if (photoPath != null) 'photoPath': photoPath,
        if (notes != null) 'notes': notes,
      },
      createdAt: DateTime.now(),
    );
    await _localDb.addToSyncQueue(action);
    syncPendingActions();
  }

  int getPendingActionsCount() {
    return _localDb.getPendingSyncActions().length;
  }

  Future<void> queueBatchPickup(List<int> orderIds) async {
    final action = SyncAction(
      id: '',
      type: 'batch_pickup',
      orderId: 0, // Not used for batch operations
      payload: {'order_ids': orderIds},
      createdAt: DateTime.now(),
    );
    await _localDb.addToSyncQueue(action);

    // Try immediate sync
    syncPendingActions();
  }

  Future<void> queueBatchDelivery(
    List<int> orderIds, {
    List<Map<String, dynamic>>? proofs,
  }) async {
    final action = SyncAction(
      id: '',
      type: 'batch_delivery',
      orderId: 0, // Not used for batch operations
      payload: {
        'order_ids': orderIds,
        if (proofs != null) 'proofs': proofs,
      },
      createdAt: DateTime.now(),
    );
    await _localDb.addToSyncQueue(action);

    // Try immediate sync
    syncPendingActions();
  }
}
