import 'package:driver_app/features/orders/data/models/order_model.dart';
import 'package:hive_flutter/hive_flutter.dart';

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
  Future<void> cacheOrders(List<Order> orders) async {
    await _ordersBox.clear();
    for (final order in orders) {
      await _ordersBox.put(order.id, _orderToMap(order));
    }
  }

  List<Order> getCachedOrders() {
    return _ordersBox.values
        .map((map) => _orderFromMap(Map<String, dynamic>.from(map)))
        .toList();
  }

  Future<void> updateCachedOrder(Order order) async {
    await _ordersBox.put(order.id, _orderToMap(order));
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

  // Settings
  Future<void> setSetting(String key, dynamic value) async {
    await _settingsBox.put(key, value);
  }

  T? getSetting<T>(String key, {T? defaultValue}) {
    return _settingsBox.get(key, defaultValue: defaultValue) as T?;
  }

  // Helper methods
  Map<String, dynamic> _orderToMap(Order order) {
    return {
      'id': order.id,
      'orderNumber': order.orderNumber,
      'status': order.status.name,
      'customerName': order.customerName,
      'customerPhone': order.customerPhone,
      'deliveryAddress': order.deliveryAddress,
      'latitude': order.latitude,
      'longitude': order.longitude,
      'totalAmount': order.totalAmount,
      'paymentMethod': order.paymentMethod,
      'scheduledAt': order.scheduledAt?.toIso8601String(),
      'createdAt': order.createdAt.toIso8601String(),
    };
  }

  Order _orderFromMap(Map<String, dynamic> map) {
    return Order(
      id: map['id'],
      orderNumber: map['orderNumber'],
      status: OrderStatus.values.firstWhere(
        (s) => s.name == map['status'],
        orElse: () => OrderStatus.pending,
      ),
      customerName: map['customerName'],
      customerPhone: map['customerPhone'],
      deliveryAddress: map['deliveryAddress'],
      latitude: map['latitude'],
      longitude: map['longitude'],
      totalAmount: (map['totalAmount'] ?? 0).toDouble(),
      paymentMethod: map['paymentMethod'],
      scheduledAt: map['scheduledAt'] != null
          ? DateTime.parse(map['scheduledAt'])
          : null,
      createdAt: DateTime.parse(map['createdAt']),
    );
  }
}

// Sync Action Model
class SyncAction {
  final String id;
  final String type; // 'status_update', 'delivery_complete', 'rejection'
  final int orderId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;

  SyncAction({
    required this.id,
    required this.type,
    required this.orderId,
    required this.payload,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
    'type': type,
    'orderId': orderId,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
  };

  factory SyncAction.fromMap(String id, Map<String, dynamic> map) {
    return SyncAction(
      id: id,
      type: map['type'],
      orderId: map['orderId'],
      payload: Map<String, dynamic>.from(map['payload'] ?? {}),
      createdAt: DateTime.parse(map['createdAt']),
    );
  }
}
