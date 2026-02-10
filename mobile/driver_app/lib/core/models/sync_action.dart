/// Represents a queued action to be synced with the server
class SyncAction {
  final String id;
  final String type; // 'status_update', 'delivery_complete', 'rejection', 'batch_pickup', 'batch_delivery'
  final int orderId;
  final Map<String, dynamic> payload;
  final DateTime createdAt;

  /// Server's last known updated_at timestamp for the order at the time of action creation.
  /// Used for conflict detection - if server's current updated_at is newer, there's a conflict.
  final DateTime? serverUpdatedAt;

  /// Number of times this action has been retried.
  /// Used for exponential backoff (max 3 retries).
  final int retryCount;

  /// Timestamp of last retry attempt.
  /// Used to calculate next retry time with exponential backoff.
  final DateTime? lastRetryAt;

  SyncAction({
    required this.id,
    required this.type,
    required this.orderId,
    required this.payload,
    required this.createdAt,
    this.serverUpdatedAt,
    this.retryCount = 0,
    this.lastRetryAt,
  });

  /// Maximum number of retry attempts before giving up
  static const int maxRetries = 3;

  /// Base delay in milliseconds for exponential backoff (1 second)
  static const int baseDelayMs = 1000;

  /// Returns true if this action has exceeded max retry attempts
  bool get hasExceededRetries => retryCount >= maxRetries;

  /// Calculates the next retry delay using exponential backoff
  /// Returns delay in milliseconds: 1s, 2s, 4s for retries 0, 1, 2
  int get nextRetryDelayMs => baseDelayMs * (1 << retryCount);

  /// Returns true if enough time has passed since last retry (respecting backoff)
  bool get canRetry {
    if (hasExceededRetries) {
      return false;
    }
    if (lastRetryAt == null) {
      return true;
    }

    final timeSinceLastRetry = DateTime.now().difference(lastRetryAt!).inMilliseconds;
    return timeSinceLastRetry >= nextRetryDelayMs;
  }

  /// Creates a new SyncAction with incremented retry count
  SyncAction withIncrementedRetry() {
    return SyncAction(
      id: id,
      type: type,
      orderId: orderId,
      payload: payload,
      createdAt: createdAt,
      serverUpdatedAt: serverUpdatedAt,
      retryCount: retryCount + 1,
      lastRetryAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'type': type,
    'orderId': orderId,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'serverUpdatedAt': serverUpdatedAt?.toIso8601String(),
    'retryCount': retryCount,
    'lastRetryAt': lastRetryAt?.toIso8601String(),
  };

  factory SyncAction.fromMap(String id, Map<String, dynamic> map) {
    return SyncAction(
      id: id,
      type: map['type'],
      orderId: map['orderId'],
      payload: Map<String, dynamic>.from(map['payload'] ?? {}),
      createdAt: DateTime.parse(map['createdAt']),
      serverUpdatedAt: map['serverUpdatedAt'] != null
          ? DateTime.parse(map['serverUpdatedAt'])
          : null,
      retryCount: map['retryCount'] ?? 0,
      lastRetryAt: map['lastRetryAt'] != null
          ? DateTime.parse(map['lastRetryAt'])
          : null,
    );
  }
}

/// Result of a sync conflict check
enum ConflictResult {
  /// No conflict - local action can proceed
  noConflict,

  /// Server has newer data - local changes should be discarded
  serverWins,

  /// Resource not found on server - action should be discarded
  resourceNotFound,

  /// Network error - should retry later
  networkError,
}
