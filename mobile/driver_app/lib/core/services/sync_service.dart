import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:driver_app/core/services/local_database_service.dart';
import 'package:driver_app/features/orders/data/order_service.dart';
import 'package:driver_app/features/orders/domain/repositories/order_repository.dart';
import 'package:logger/logger.dart';

/// Callback for notifying the app when a conflict is resolved
typedef ConflictCallback = void Function(int orderId, String message);

/// Callback for refreshing order data after conflict resolution
typedef RefreshOrderCallback = Future<void> Function(int orderId);

class SyncService {
  final LocalDatabaseService _localDb;
  final OrderService _orderService;
  final OrderRepository? _orderRepository;
  final Logger _logger = Logger();

  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  bool _isSyncing = false;
  Timer? _retryTimer;

  /// Callback to notify when a conflict is resolved (server wins)
  ConflictCallback? onConflictResolved;

  /// Callback to refresh order data after conflict resolution
  RefreshOrderCallback? onRefreshOrder;

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

    // Also start periodic retry timer for failed actions
    _startRetryTimer();
  }

  void stopMonitoring() {
    _connectivitySubscription?.cancel();
    _retryTimer?.cancel();
  }

  /// Starts a periodic timer to retry failed actions
  void _startRetryTimer() {
    _retryTimer?.cancel();
    _retryTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_isSyncing) {
        syncPendingActions();
      }
    });
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
        // Skip actions that are in backoff period
        if (!action.canRetry) {
          _logger.d(
            'Skipping action ${action.id} - in backoff period (retry ${action.retryCount}/${SyncAction.maxRetries})',
          );
          continue;
        }

        // Check if action has exceeded max retries
        if (action.hasExceededRetries) {
          _logger.w(
            'Removing action ${action.id} after ${action.retryCount} failed retries',
          );
          await _localDb.removeSyncAction(action.id);
          continue;
        }

        try {
          // Check for conflicts before processing (only for single-order actions)
          if (action.orderId > 0 && action.serverUpdatedAt != null) {
            final conflictResult = await _checkForConflict(action);

            switch (conflictResult) {
              case ConflictResult.serverWins:
                _logger.w(
                  'Conflict detected for order ${action.orderId} - server has newer data, discarding local changes',
                );
                await _localDb.removeSyncAction(action.id);
                await _handleConflictResolution(action);
                continue;

              case ConflictResult.resourceNotFound:
                _logger.w(
                  'Order ${action.orderId} not found on server - discarding action',
                );
                await _localDb.removeSyncAction(action.id);
                continue;

              case ConflictResult.networkError:
                _logger.w(
                  'Network error checking conflict for order ${action.orderId} - will retry',
                );
                await _handleRetry(action);
                continue;

              case ConflictResult.noConflict:
                // Proceed with sync
                break;
            }
          }

          await _processAction(action);
          await _localDb.removeSyncAction(action.id);
          _logger.i(
            'Synced action: ${action.type} for order ${action.orderId}',
          );
        } on DioException catch (e) {
          _logger.e('DioException syncing action ${action.id}: ${e.message}');
          await _handleRetry(action);
        } catch (e) {
          _logger.e('Failed to sync action ${action.id}: $e');
          await _handleRetry(action);
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  /// Checks if the server has newer data than our local snapshot
  Future<ConflictResult> _checkForConflict(SyncAction action) async {
    if (_orderRepository == null) {
      // Can't check conflict without repository, assume no conflict
      return ConflictResult.noConflict;
    }

    try {
      final serverOrder = await _orderRepository.getOrderDetails(action.orderId);
      final serverUpdatedAt = serverOrder.updatedAt;
      final localSnapshot = action.serverUpdatedAt;

      if (localSnapshot == null) {
        // No local snapshot, can't compare - assume no conflict
        return ConflictResult.noConflict;
      }

      // If server's updated_at is after our local snapshot, there's a conflict
      if (serverUpdatedAt.isAfter(localSnapshot)) {
        return ConflictResult.serverWins;
      }

      return ConflictResult.noConflict;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return ConflictResult.resourceNotFound;
      }
      return ConflictResult.networkError;
    } catch (e) {
      _logger.e('Error checking conflict: $e');
      return ConflictResult.networkError;
    }
  }

  /// Handles conflict resolution - notifies app and refreshes order data
  Future<void> _handleConflictResolution(SyncAction action) async {
    // Notify the app about the conflict
    if (onConflictResolved != null) {
      onConflictResolved!(
        action.orderId,
        'Your changes were discarded because the order was modified on the server.',
      );
    }

    // Refresh the order data from server
    if (onRefreshOrder != null) {
      try {
        await onRefreshOrder!(action.orderId);
        _logger.i('Refreshed order ${action.orderId} after conflict resolution');
      } catch (e) {
        _logger.e('Failed to refresh order ${action.orderId} after conflict: $e');
      }
    }
  }

  /// Handles retry logic with exponential backoff
  Future<void> _handleRetry(SyncAction action) async {
    final updatedAction = action.withIncrementedRetry();

    if (updatedAction.hasExceededRetries) {
      _logger.w(
        'Action ${action.id} exceeded max retries (${SyncAction.maxRetries}), removing from queue',
      );
      await _localDb.removeSyncAction(action.id);
    } else {
      _logger.i(
        'Scheduling retry ${updatedAction.retryCount}/${SyncAction.maxRetries} for action ${action.id} in ${updatedAction.nextRetryDelayMs}ms',
      );
      await _localDb.updateSyncAction(updatedAction);
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

  /// Queues a status update action with server timestamp for conflict detection
  Future<void> queueStatusUpdate(
    int orderId,
    String status, {
    DateTime? serverUpdatedAt,
  }) async {
    final action = SyncAction(
      id: '',
      type: 'status_update',
      orderId: orderId,
      payload: {'status': status},
      createdAt: DateTime.now(),
      serverUpdatedAt: serverUpdatedAt,
    );
    await _localDb.addToSyncQueue(action);

    // Try immediate sync
    syncPendingActions();
  }

  /// Queues a delivery completion action with server timestamp for conflict detection
  Future<void> queueDeliveryComplete(
    int orderId, {
    String? photoPath,
    String? notes,
    DateTime? serverUpdatedAt,
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
      serverUpdatedAt: serverUpdatedAt,
    );
    await _localDb.addToSyncQueue(action);
    syncPendingActions();
  }

  int getPendingActionsCount() {
    return _localDb.getPendingSyncActions().length;
  }

  /// Queues a batch pickup action
  /// Note: Batch operations don't support conflict detection since they affect multiple orders
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

  /// Queues a batch delivery action
  /// Note: Batch operations don't support conflict detection since they affect multiple orders
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

  /// Clears all pending sync actions (use with caution)
  Future<void> clearPendingActions() async {
    await _localDb.clearSyncQueue();
  }

  /// Gets information about pending actions for debugging/UI
  List<Map<String, dynamic>> getPendingActionsInfo() {
    final actions = _localDb.getPendingSyncActions();
    return actions.map((action) => {
      'id': action.id,
      'type': action.type,
      'orderId': action.orderId,
      'retryCount': action.retryCount,
      'canRetry': action.canRetry,
      'createdAt': action.createdAt.toIso8601String(),
    }).toList();
  }
}
