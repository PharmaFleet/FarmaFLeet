import '../../domain/entities/notification_entity.dart';

/// Data model for notifications that extends [NotificationEntity].
///
/// Provides JSON serialization/deserialization capabilities.
class NotificationModel extends NotificationEntity {
  const NotificationModel({
    required super.id,
    required super.title,
    required super.body,
    super.data,
    super.isRead,
    required super.createdAt,
    super.type,
  });

  /// Creates a [NotificationModel] from a JSON map.
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as int,
      title: json['title'] as String? ?? 'Notification',
      body: json['body'] as String? ?? '',
      data: json['data'] as Map<String, dynamic>?,
      isRead: json['is_read'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      type: json['type'] as String?,
    );
  }

  /// Converts this model to a JSON map.
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'data': data,
      'is_read': isRead,
      'created_at': createdAt.toIso8601String(),
      'type': type,
    };
  }

  /// Creates a copy of this model with optional field overrides.
  @override
  NotificationModel copyWith({
    int? id,
    String? title,
    String? body,
    Map<String, dynamic>? data,
    bool? isRead,
    DateTime? createdAt,
    String? type,
  }) {
    return NotificationModel(
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
