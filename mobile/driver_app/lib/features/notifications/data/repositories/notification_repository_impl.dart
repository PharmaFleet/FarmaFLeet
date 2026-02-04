import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../domain/entities/notification_entity.dart';
import '../../domain/repositories/notification_repository.dart';
import '../models/notification_model.dart';

/// Implementation of [NotificationRepository] using Dio for API calls.
class NotificationRepositoryImpl implements NotificationRepository {
  final Dio _dio;

  NotificationRepositoryImpl(this._dio);

  @override
  Future<List<NotificationEntity>> getNotifications({
    int skip = 0,
    int limit = 20,
  }) async {
    debugPrint('[NotificationRepo] Fetching notifications: skip=$skip, limit=$limit');
    try {
      final response = await _dio.get(
        '/notifications',
        queryParameters: {
          'skip': skip,
          'limit': limit,
        },
      );

      final List<dynamic> data = response.data;
      debugPrint('[NotificationRepo] Fetched ${data.length} notifications');
      return data.map((json) => NotificationModel.fromJson(json)).toList();
    } on DioException catch (e) {
      debugPrint('[NotificationRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      if (e.response?.statusCode == 401) {
        throw Exception('Unauthorized - please login again');
      }
      throw Exception('Failed to fetch notifications: ${e.message}');
    } catch (e) {
      debugPrint('[NotificationRepo] Exception: $e');
      throw Exception('Failed to fetch notifications: $e');
    }
  }

  @override
  Future<void> markAsRead(int id) async {
    debugPrint('[NotificationRepo] Marking notification $id as read');
    try {
      await _dio.patch('/notifications/$id/read');
      debugPrint('[NotificationRepo] Notification $id marked as read');
    } on DioException catch (e) {
      debugPrint('[NotificationRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      throw Exception('Failed to mark notification as read: ${e.message}');
    } catch (e) {
      debugPrint('[NotificationRepo] Exception: $e');
      throw Exception('Failed to mark notification as read: $e');
    }
  }

  @override
  Future<void> markAllAsRead() async {
    debugPrint('[NotificationRepo] Marking all notifications as read');
    try {
      await _dio.patch('/notifications/mark-all-read');
      debugPrint('[NotificationRepo] All notifications marked as read');
    } on DioException catch (e) {
      debugPrint('[NotificationRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      throw Exception('Failed to mark all notifications as read: ${e.message}');
    } catch (e) {
      debugPrint('[NotificationRepo] Exception: $e');
      throw Exception('Failed to mark all notifications as read: $e');
    }
  }

  @override
  Future<void> clearNotifications({bool keepUnread = false}) async {
    debugPrint('[NotificationRepo] Clearing notifications (keepUnread=$keepUnread)');
    try {
      await _dio.delete(
        '/notifications/clear',
        queryParameters: {
          'keep_unread': keepUnread,
        },
      );
      debugPrint('[NotificationRepo] Notifications cleared');
    } on DioException catch (e) {
      debugPrint('[NotificationRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      throw Exception('Failed to clear notifications: ${e.message}');
    } catch (e) {
      debugPrint('[NotificationRepo] Exception: $e');
      throw Exception('Failed to clear notifications: $e');
    }
  }

  @override
  Future<int> getUnreadCount() async {
    debugPrint('[NotificationRepo] Getting unread count');
    try {
      final response = await _dio.get('/notifications/unread-count');
      final count = response.data['unread_count'] as int? ?? 0;
      debugPrint('[NotificationRepo] Unread count: $count');
      return count;
    } on DioException catch (e) {
      debugPrint('[NotificationRepo] DioException: ${e.response?.statusCode} - ${e.message}');
      // Return 0 on error to prevent UI issues
      return 0;
    } catch (e) {
      debugPrint('[NotificationRepo] Exception: $e');
      return 0;
    }
  }
}
