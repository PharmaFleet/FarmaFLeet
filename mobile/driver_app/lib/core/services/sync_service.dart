import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:driver_app/core/services/local_database_service.dart';
import 'package:driver_app/features/orders/data/order_service.dart';
import 'package:logger/logger.dart';

class SyncService {
  final LocalDatabaseService _localDb;
  final OrderService _orderService;
  final Logger _logger = Logger();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _isSyncing = false;

  SyncService(this._localDb, this._orderService);

  void startMonitoring() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      results,
    ) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection && !_isSyncing) {
        syncPendingActions();
      }
    });
  }

  void stopMonitoring() {
    _connectivitySubscription?.cancel();
  }

  Future<bool> hasConnection() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  Future<void> syncPendingActions() async {
    if (_isSyncing) return;

    final isOnline = await hasConnection();
    if (!isOnline) return;

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
}
