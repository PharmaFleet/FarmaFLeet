import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

interface UseWebSocketOptions {
  url: string;
  onMessage: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  disconnect: () => void;
  error: Error | null;
}

/**
 * Custom hook for WebSocket connections with auto-reconnect
 * 
 * @example
 * const { isConnected, disconnect, error } = useWebSocket({
 *   url: '/ws/drivers',
 *   onMessage: (msg) => console.log(msg),
 *   onError: (err) => console.error(err),
 * });
 */
export function useWebSocket({
  url,
  onMessage,
  onError,
  onConnect,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const token = useAuthStore((state) => state.token);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
    setError(null);
  }, []);

  const connect = useCallback(() => {
    // Don't connect if no token is available
    if (!token) {
      console.warn('[WebSocket] No authentication token available');
      setError(new Error('No authentication token available'));
      return;
    }

    // Construct WebSocket URL with token
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}${url}?token=${encodeURIComponent(token)}`;

    console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setError(null);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message.type, message);
          onMessage(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err, event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Connection error:', event);
        setError(new Error('WebSocket connection error'));
        onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if under max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WebSocket] Max reconnect attempts reached');
          setError(new Error('Max WebSocket reconnect attempts reached'));
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect WebSocket'));
    }
  }, [url, token, onMessage, onError, onConnect, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { isConnected, disconnect, error };
}
