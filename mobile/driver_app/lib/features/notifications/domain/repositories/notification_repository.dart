import '../entities/notification_entity.dart';

/// Abstract repository interface for notification operations.
///
/// This defines the contract for notification data access,
/// allowing different implementations (API, local storage, mock).
abstract class NotificationRepository {
  /// Fetches a paginated list of notifications.
  ///
  /// [skip] - Number of notifications to skip (for pagination).
  /// [limit] - Maximum number of notifications to return.
  /// Returns a list of [NotificationEntity].
  Future<List<NotificationEntity>> getNotifications({
    int skip = 0,
    int limit = 20,
  });

  /// Marks a specific notification as read.
  ///
  /// [id] - The notification ID to mark as read.
  Future<void> markAsRead(int id);

  /// Marks all notifications as read.
  Future<void> markAllAsRead();

  /// Clears notifications.
  ///
  /// [keepUnread] - If true, only read notifications are deleted.
  Future<void> clearNotifications({bool keepUnread = false});

  /// Gets the count of unread notifications.
  ///
  /// Returns the number of unread notifications.
  Future<int> getUnreadCount();
}
