import 'package:equatable/equatable.dart';

/// Represents a notification entity with all its properties.
///
/// This entity is the core domain object for notifications in the app.
class NotificationEntity extends Equatable {
  /// Unique identifier for the notification
  final int id;

  /// Title of the notification (e.g., "New Orders Assigned")
  final String title;

  /// Body/message of the notification
  final String body;

  /// Additional data associated with the notification
  /// This can contain order IDs, navigation targets, etc.
  final Map<String, dynamic>? data;

  /// Whether the notification has been read
  final bool isRead;

  /// When the notification was created
  final DateTime createdAt;

  /// Type of notification (e.g., 'new_orders', 'payment_collection', 'system')
  final String? type;

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    this.data,
    this.isRead = false,
    required this.createdAt,
    this.type,
  });

  @override
  List<Object?> get props => [id, title, body, data, isRead, createdAt, type];

  /// Creates a copy of this entity with optional field overrides
  NotificationEntity copyWith({
    int? id,
    String? title,
    String? body,
    Map<String, dynamic>? data,
    bool? isRead,
    DateTime? createdAt,
    String? type,
  }) {
    return NotificationEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      data: data ?? this.data,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      type: type ?? this.type,
    );
  }
}
