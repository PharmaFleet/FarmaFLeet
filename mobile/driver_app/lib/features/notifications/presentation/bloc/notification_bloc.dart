import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/notification_entity.dart';
import '../../domain/repositories/notification_repository.dart';

// ===== Events =====

/// Base class for all notification events.
abstract class NotificationEvent extends Equatable {
  const NotificationEvent();
  @override
  List<Object?> get props => [];
}

/// Event to fetch notifications from the repository.
class FetchNotifications extends NotificationEvent {
  final bool refresh;
  const FetchNotifications({this.refresh = false});
  @override
  List<Object?> get props => [refresh];
}

/// Event to mark a specific notification as read.
class MarkAsRead extends NotificationEvent {
  final int id;
  const MarkAsRead(this.id);
  @override
  List<Object?> get props => [id];
}

/// Event to mark all notifications as read.
class MarkAllRead extends NotificationEvent {
  const MarkAllRead();
}

/// Event to clear notifications.
class ClearNotifications extends NotificationEvent {
  final bool keepUnread;
  const ClearNotifications({this.keepUnread = false});
  @override
  List<Object?> get props => [keepUnread];
}

/// Event when a notification is tapped.
class NotificationTapped extends NotificationEvent {
  final NotificationEntity notification;
  const NotificationTapped(this.notification);
  @override
  List<Object?> get props => [notification];
}

/// Event to refresh the unread count.
class RefreshUnreadCount extends NotificationEvent {
  const RefreshUnreadCount();
}

// ===== States =====

/// Base class for all notification states.
abstract class NotificationState extends Equatable {
  const NotificationState();
  @override
  List<Object?> get props => [];
}

/// Initial state before any notifications are loaded.
class NotificationsInitial extends NotificationState {}

/// State when notifications are being loaded.
class NotificationsLoading extends NotificationState {}

/// State when notifications have been loaded successfully.
class NotificationsLoaded extends NotificationState {
  final List<NotificationEntity> notifications;
  final int unreadCount;
  final bool hasMore;

  const NotificationsLoaded({
    required this.notifications,
    required this.unreadCount,
    this.hasMore = true,
  });

  @override
  List<Object?> get props => [notifications, unreadCount, hasMore];

  NotificationsLoaded copyWith({
    List<NotificationEntity>? notifications,
    int? unreadCount,
    bool? hasMore,
  }) {
    return NotificationsLoaded(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

/// State when an error occurs while loading notifications.
class NotificationsError extends NotificationState {
  final String message;
  const NotificationsError(this.message);
  @override
  List<Object?> get props => [message];
}

/// State when a notification action is being processed.
class NotificationActionInProgress extends NotificationState {
  final List<NotificationEntity> notifications;
  final int unreadCount;
  final int? processingId;

  const NotificationActionInProgress({
    required this.notifications,
    required this.unreadCount,
    this.processingId,
  });

  @override
  List<Object?> get props => [notifications, unreadCount, processingId];
}

// ===== BLoC =====

/// BLoC for managing notification state and actions.
class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  final NotificationRepository _repository;

  static const int _pageSize = 20;
  int _currentSkip = 0;

  NotificationBloc(this._repository) : super(NotificationsInitial()) {
    on<FetchNotifications>(_onFetchNotifications);
    on<MarkAsRead>(_onMarkAsRead);
    on<MarkAllRead>(_onMarkAllRead);
    on<ClearNotifications>(_onClearNotifications);
    on<NotificationTapped>(_onNotificationTapped);
    on<RefreshUnreadCount>(_onRefreshUnreadCount);
  }

  Future<void> _onFetchNotifications(
    FetchNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      if (event.refresh) {
        _currentSkip = 0;
        emit(NotificationsLoading());
      }

      final notifications = await _repository.getNotifications(
        skip: _currentSkip,
        limit: _pageSize,
      );
      final unreadCount = await _repository.getUnreadCount();

      final hasMore = notifications.length >= _pageSize;
      _currentSkip += notifications.length;

      if (state is NotificationsLoaded && !event.refresh) {
        // Append to existing notifications
        final currentState = state as NotificationsLoaded;
        emit(NotificationsLoaded(
          notifications: [...currentState.notifications, ...notifications],
          unreadCount: unreadCount,
          hasMore: hasMore,
        ));
      } else {
        emit(NotificationsLoaded(
          notifications: notifications,
          unreadCount: unreadCount,
          hasMore: hasMore,
        ));
      }
    } catch (e) {
      emit(NotificationsError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMarkAsRead(
    MarkAsRead event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationsLoaded) {
      return;
    }

    final currentState = state as NotificationsLoaded;

    // Show processing state
    emit(NotificationActionInProgress(
      notifications: currentState.notifications,
      unreadCount: currentState.unreadCount,
      processingId: event.id,
    ));

    try {
      await _repository.markAsRead(event.id);

      // Update local state
      final updatedNotifications = currentState.notifications.map((n) {
        if (n.id == event.id) {
          return n.copyWith(isRead: true);
        }
        return n;
      }).toList();

      final newUnreadCount = updatedNotifications.where((n) => !n.isRead).length;

      emit(NotificationsLoaded(
        notifications: updatedNotifications,
        unreadCount: newUnreadCount,
        hasMore: currentState.hasMore,
      ));
    } catch (e) {
      // Revert to previous state on error
      emit(currentState);
    }
  }

  Future<void> _onMarkAllRead(
    MarkAllRead event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationsLoaded) {
      return;
    }

    final currentState = state as NotificationsLoaded;

    // Show processing state
    emit(NotificationActionInProgress(
      notifications: currentState.notifications,
      unreadCount: currentState.unreadCount,
    ));

    try {
      await _repository.markAllAsRead();

      // Update local state - mark all as read
      final updatedNotifications = currentState.notifications.map((n) {
        return n.copyWith(isRead: true);
      }).toList();

      emit(NotificationsLoaded(
        notifications: updatedNotifications,
        unreadCount: 0,
        hasMore: currentState.hasMore,
      ));
    } catch (e) {
      // Revert to previous state on error
      emit(currentState);
    }
  }

  Future<void> _onClearNotifications(
    ClearNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationsLoaded) {
      return;
    }

    final currentState = state as NotificationsLoaded;

    // Show processing state
    emit(NotificationActionInProgress(
      notifications: currentState.notifications,
      unreadCount: currentState.unreadCount,
    ));

    try {
      await _repository.clearNotifications(keepUnread: event.keepUnread);

      // Update local state
      if (event.keepUnread) {
        // Keep only unread notifications
        final unreadNotifications = currentState.notifications
            .where((n) => !n.isRead)
            .toList();
        emit(NotificationsLoaded(
          notifications: unreadNotifications,
          unreadCount: unreadNotifications.length,
          hasMore: false,
        ));
      } else {
        // Clear all
        emit(const NotificationsLoaded(
          notifications: [],
          unreadCount: 0,
          hasMore: false,
        ));
      }
      _currentSkip = 0;
    } catch (e) {
      // Revert to previous state on error
      emit(currentState);
    }
  }

  Future<void> _onNotificationTapped(
    NotificationTapped event,
    Emitter<NotificationState> emit,
  ) async {
    // Mark as read when tapped
    if (!event.notification.isRead) {
      add(MarkAsRead(event.notification.id));
    }
    // Navigation is handled by the UI layer based on notification type/data
  }

  Future<void> _onRefreshUnreadCount(
    RefreshUnreadCount event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      final unreadCount = await _repository.getUnreadCount();

      if (state is NotificationsLoaded) {
        final currentState = state as NotificationsLoaded;
        emit(currentState.copyWith(unreadCount: unreadCount));
      }
    } catch (_) {
      // Silently fail - don't disrupt the UI
    }
  }
}
