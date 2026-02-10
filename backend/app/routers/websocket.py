"""WebSocket router for real-time driver location updates."""

from __future__ import annotations

import json
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from jose import jwt, JWTError

import redis.asyncio as redis
import asyncio

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for driver location broadcasts."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, token: str | None = None) -> bool:
        """
        Accept WebSocket connection with REQUIRED token authentication.

        Args:
            websocket: The WebSocket connection
            token: JWT token for authentication (REQUIRED)

        Returns:
            bool: True if connection accepted, False otherwise
        """
        try:
            # SECURITY: Token is now REQUIRED, not optional
            if not token:
                logger.warning("WebSocket connection rejected: no token provided")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return False

            # Validate token BEFORE accepting connection
            try:
                payload = jwt.decode(
                    token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
                )
                user_id = payload.get("sub")

                if not user_id:
                    logger.warning("WebSocket token missing 'sub' claim")
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                    return False

                # Token is valid, now accept the connection
                await websocket.accept()
                self.active_connections.append(websocket)
                self.connection_info[websocket] = {
                    "connected_at": datetime.now(timezone.utc),
                    "token": token,
                    "authenticated": True,
                    "user_id": int(user_id),
                }

                logger.info(
                    f"Authenticated WebSocket connection for user {user_id}. "
                    f"Total connections: {len(self.active_connections)}"
                )
                return True

            except JWTError as e:
                logger.warning(f"Invalid WebSocket token: {e}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return False

        except Exception as e:
            logger.error(f"Failed to accept WebSocket connection: {e}")
            try:
                await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except Exception:
                pass
            return False

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove WebSocket connection.

        Args:
            websocket: The WebSocket connection to remove
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            connection_info = self.connection_info.pop(websocket, {})
            user_id = connection_info.get("user_id", "unknown")
            logger.info(
                f"WebSocket disconnected for user {user_id}. "
                f"Total connections: {len(self.active_connections)}"
            )

    async def broadcast(self, message: str | Dict[str, Any]) -> None:
        """
        Broadcast message to all connected clients.

        Args:
            message: Message to broadcast (string or dict)
        """
        if isinstance(message, dict):
            message = json.dumps(message)

        disconnected: List[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send message to client: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal_message(
        self, message: str | Dict[str, Any], websocket: WebSocket
    ) -> bool:
        """
        Send message to specific client.

        Args:
            message: Message to send
            websocket: Target WebSocket connection

        Returns:
            bool: True if sent successfully
        """
        if isinstance(message, dict):
            message = json.dumps(message)

        try:
            await websocket.send_text(message)
            return True
        except Exception as e:
            logger.warning(f"Failed to send personal message: {e}")
            self.disconnect(websocket)
            return False

    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        return len(self.active_connections)

    def get_connection_stats(self) -> Dict[str, int]:
        """Get connection statistics."""
        total = len(self.active_connections)
        authenticated = sum(
            1 for info in self.connection_info.values() if info.get("authenticated")
        )
        return {
            "total_connections": total,
            "authenticated": authenticated,
            "anonymous": total - authenticated,
        }


# Global connection manager instance
manager = ConnectionManager()

# Redis subscriber task
redis_client: redis.Redis | None = None
redis_pubsub: redis.client.PubSub | None = None


async def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return redis_client


async def redis_listener() -> None:
    """
    Listen to Redis 'driver_locations' channel and broadcast messages.
    This runs as a background task.
    """
    try:
        client = await get_redis_client()
        pubsub = client.pubsub()
        await pubsub.subscribe("driver_locations")

        logger.info(
            "Redis listener started for 'driver_locations' channel. Waiting for messages..."
        )

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    logger.info(
                        f"Redis listener received message: {message['data'][:100]}..."
                    )  # Log first 100 chars
                    data = message["data"]
                    # Broadcast to all WebSocket clients
                    await manager.broadcast(data)
                    logger.info(
                        f"Broadcasted Redis message to {manager.get_connection_count()} clients"
                    )
                except Exception as e:
                    logger.error(f"Error broadcasting Redis message: {e}")

    except Exception as e:
        logger.error(f"Redis listener error: {e}")


async def start_redis_listener() -> None:
    """Start the Redis listener in a background task."""
    try:
        asyncio.create_task(redis_listener())
        logger.info("Redis listener task created")
    except Exception as e:
        logger.error(f"Failed to start Redis listener: {e}")


@router.websocket("/ws/drivers")
async def driver_websocket(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token for authentication (REQUIRED)"),
) -> None:
    """
    WebSocket endpoint for real-time driver location updates.

    SECURITY: Authentication is REQUIRED. Unauthenticated connections will be rejected.

    - Requires valid JWT token via query parameter
    - Subscribes to Redis 'driver_locations' channel
    - Broadcasts location updates to all authenticated clients
    - Handles disconnections gracefully

    Connection URL example: /ws/drivers?token=<jwt_token>
    """
    connected = await manager.connect(websocket, token)
    if not connected:
        return

    # Send connection confirmation
    await manager.send_personal_message(
        {
            "event": "connected",
            "message": "Successfully connected to driver location updates",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "authenticated": manager.connection_info.get(websocket, {}).get(
                "authenticated", False
            ),
        },
        websocket,
    )

    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                event = message.get("event")

                if event == "ping":
                    await manager.send_personal_message(
                        {"event": "pong", "timestamp": datetime.now(timezone.utc).isoformat()},
                        websocket,
                    )

                elif event == "get_stats":
                    stats = manager.get_connection_stats()
                    await manager.send_personal_message(
                        {"event": "stats", "data": stats}, websocket
                    )

                elif event == "subscribe":
                    # Client can subscribe to specific driver updates
                    driver_id = message.get("driver_id")
                    if driver_id:
                        # Store subscription preference
                        if websocket in manager.connection_info:
                            manager.connection_info[websocket]["subscribed_driver"] = (
                                driver_id
                            )
                        await manager.send_personal_message(
                            {
                                "event": "subscribed",
                                "driver_id": driver_id,
                            },
                            websocket,
                        )

                else:
                    logger.debug(f"Received unknown event from client: {event}")

            except json.JSONDecodeError:
                # Handle plain text messages
                logger.debug(f"Received non-JSON message: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected from WebSocket")

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats() -> Dict[str, Any]:
    """
    Get WebSocket connection statistics.
    """
    return {
        "connections": manager.get_connection_stats(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
