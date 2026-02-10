import 'package:driver_app/core/models/sync_action.dart';
import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:hive_flutter/hive_flutter.dart';

export 'package:driver_app/core/models/sync_action.dart';

class LocalDatabaseService {
  static const String ordersBoxName = 'orders_cache';
  static const String syncQueueBoxName = 'sync_queue';
  static const String settingsBoxName = 'settings';

  late Box<Map> _ordersBox;
  late Box<Map> _syncQueueBox;
  late Box _settingsBox;

  Future<void> initialize() async {
    await Hive.initFlutter();
    _ordersBox = await Hive.openBox<Map>(ordersBoxName);
    _syncQueueBox = await Hive.openBox<Map>(syncQueueBoxName);
    _settingsBox = await Hive.openBox(settingsBoxName);
  }

  // Orders Cache
  Future<void> cacheOrders(List<OrderModel> orders) async {
    await _ordersBox.clear();
    for (final order in orders) {
      await _ordersBox.put(order.id, order.toJson());
    }
  }

  List<OrderModel> getCachedOrders() {
    return _ordersBox.values
        .map((map) => OrderModel.fromJson(Map<String, dynamic>.from(map)))
        .toList();
  }

  Future<void> updateCachedOrder(OrderModel order) async {
    await _ordersBox.put(order.id, order.toJson());
  }

  // Sync Queue
  Future<void> addToSyncQueue(SyncAction action) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await _syncQueueBox.put(id, action.toMap());
  }

  List<SyncAction> getPendingSyncActions() {
    return _syncQueueBox.keys.map((key) {
      final map = Map<String, dynamic>.from(_syncQueueBox.get(key)!);
      return SyncAction.fromMap(key.toString(), map);
    }).toList();
  }

  Future<void> removeSyncAction(String id) async {
    await _syncQueueBox.delete(id);
  }

  Future<void> clearSyncQueue() async {
    await _syncQueueBox.clear();
  }

  /// Updates an existing sync action (used for retry tracking)
  Future<void> updateSyncAction(SyncAction action) async {
    await _syncQueueBox.put(action.id, action.toMap());
  }

  // Settings
  Future<void> setSetting(String key, dynamic value) async {
    await _settingsBox.put(key, value);
  }

  T? getSetting<T>(String key, {T? defaultValue}) {
    return _settingsBox.get(key, defaultValue: defaultValue) as T?;
  }
}
