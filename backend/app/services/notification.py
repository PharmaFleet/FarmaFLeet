from typing import List, Optional, Dict, Any

import os
import json
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def _build_android_config():
        """Build Android-specific FCM config for high-priority delivery."""
        return messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id="pharmafleet_driver",
                priority="high",
                default_sound=True,
            ),
        )

    def __init__(self):
        # Initialize Firebase App
        try:
            # Check if already initialized to avoid "legacy" app errors in reloads
            if not firebase_admin._apps:
                cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
                if cred_json:
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
                    logger.info("[FCM] Firebase initialized successfully.")
                else:
                    logger.warning(
                        "[FCM] FIREBASE_CREDENTIALS_JSON not found. Running in mock mode."
                    )
        except Exception as e:
            logger.error(f"[FCM] Failed to initialize Firebase: {e}")

    async def send_to_topic(
        self, topic: str, title: str, body: str, data: Optional[Dict[str, Any]] = None
    ):
        """Send a message to a topic."""
        try:
            if not firebase_admin._apps:
                logger.debug(f"[MOCK FCM] Sending to topic {topic}: {title} - {body}")
                return "mock-message-id"

            message = messaging.Message(
                topic=topic,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                android=self._build_android_config(),
            )
            response = messaging.send(message)
            return response
        except Exception as e:
            logger.error(f"[FCM Error] send_to_topic: {e}")
            return None

    async def send_to_token(
        self, token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None
    ):
        """Send a message to a specific device token.

        Returns:
            str: Message ID on success, "INVALID_TOKEN" if token is stale/invalid, None on error.
        """
        try:
            if not firebase_admin._apps:
                logger.debug(f"[MOCK FCM] Sending to token {token[:10]}...: {title} - {body}")
                return "mock-message-id"

            message = messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                android=self._build_android_config(),
            )
            response = messaging.send(message)
            return response
        except (messaging.UnregisteredError, messaging.SenderIdMismatchError):
            # Token is permanently invalid - device uninstalled, token rotated, etc.
            logger.warning(f"[FCM] Invalid token detected (will be cleared): {token[:20]}...")
            return "INVALID_TOKEN"
        except Exception as e:
            logger.error(f"[FCM Error] send_to_token: {e}")
            # Check error string for known invalid-token patterns
            error_str = str(e).lower()
            if "not found" in error_str or "not registered" in error_str or "invalid registration" in error_str:
                logger.warning(f"[FCM] Token likely invalid based on error message: {token[:20]}...")
                return "INVALID_TOKEN"
            return None

    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ):
        """Send a message to multiple device tokens."""
        try:
            if not firebase_admin._apps:
                logger.debug(f"[MOCK FCM] Sending to {len(tokens)} tokens: {title} - {body}")
                return "mock-batch-response-id"

            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                android=self._build_android_config(),
            )
            response = messaging.send_multicast(message)
            return response
        except Exception as e:
            logger.error(f"[FCM Error] send_multicast: {e}")
            return None

    async def _clear_invalid_token(self, db: AsyncSession, user_id: int):
        """Clear FCM token for a user when it's detected as invalid."""
        from app.models.user import User
        from sqlalchemy import select

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user and user.fcm_token:
            logger.info(f"[FCM] Clearing invalid token for user {user_id}")
            user.fcm_token = None
            db.add(user)
            # Don't commit here - let the caller's commit handle it

    async def notify_driver_new_orders(
        self, db: AsyncSession, user_id: int, count: int, token: Optional[str] = None
    ):
        """Notify driver about new assigned orders."""
        title = "New Orders Assigned"
        body = f"You have {count} new order(s) assigned to you."

        # Save to DB
        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={"type": "new_orders", "count": str(count)},
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if token else None,
        )
        db.add(notif)
        # Note: caller should commit, but we can flush if needed.
        # Ideally we stick to caller commit pattern, but for notifications strictly,
        # sometimes we want them even if main tx fails? No, usually not.

        if token:
            result = await self.send_to_token(
                token, title, body, data={"type": "new_orders", "count": str(count)}
            )
            if result == "INVALID_TOKEN":
                await self._clear_invalid_token(db, user_id)
        else:
            logger.info(f"No token for user {user_id}, skipping push notification.")

    async def notify_driver_order_delivered(
        self, db: AsyncSession, user_id: int, order_id: int, order_number: str = "", token: Optional[str] = None
    ):
        """Notify driver that order is marked delivered."""
        title = "Order Delivered"
        display = order_number or f"#{order_id}"
        body = f"Order {display} has been successfully delivered."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={"type": "order_delivered", "order_id": str(order_id)},
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if token else None,
        )
        db.add(notif)

        if token:
            result = await self.send_to_token(
                token,
                title,
                body,
                data={"type": "order_delivered", "order_id": str(order_id)},
            )
            if result == "INVALID_TOKEN":
                await self._clear_invalid_token(db, user_id)

    async def notify_driver_payment_collected(
        self,
        db: AsyncSession,
        user_id: int,
        order_id: int,
        amount: float,
        order_number: str = "",
        token: Optional[str] = None,
    ):
        """Notify driver about payment collection."""
        title = "Payment Collected"
        display = order_number or f"#{order_id}"
        body = f"Please collect {amount:.2f} for Order {display}."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={
                "type": "payment_collection",
                "order_id": str(order_id),
                "amount": str(amount),
            },
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if token else None,
        )
        db.add(notif)

        if token:
            result = await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "payment_collection",
                    "order_id": str(order_id),
                    "amount": str(amount),
                },
            )
            if result == "INVALID_TOKEN":
                await self._clear_invalid_token(db, user_id)

    async def notify_driver_shift_limit(
        self, driver_id: int, token: Optional[str] = None, hours: int = 10
    ):
        """Notify driver about shift limit."""
        title = "Shift Reminder"
        body = (
            f"You've been online for {hours} hours. Still on shift? "
            f"Open the app to confirm, or go offline if you're done."
        )
        if token:
            await self.send_to_token(token, title, body, data={"type": "shift_limit"})

    async def notify_driver_order_cancelled(
        self,
        db: AsyncSession,
        user_id: int,
        order_id: int,
        order_number: str,
        token: Optional[str] = None,
    ):
        """Notify driver that an assigned order has been cancelled."""
        title = "Order Cancelled"
        body = f"Order {order_number} has been cancelled and removed from your assignments."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={
                "type": "order_cancelled",
                "order_id": str(order_id),
                "order_number": order_number,
            },
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if token else None,
        )
        db.add(notif)

        if token:
            result = await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "order_cancelled",
                    "order_id": str(order_id),
                    "order_number": order_number,
                },
            )
            if result == "INVALID_TOKEN":
                await self._clear_invalid_token(db, user_id)

    async def notify_driver_order_reassigned(
        self,
        db: AsyncSession,
        user_id: int,
        order_id: int,
        order_number: str,
        token: Optional[str] = None,
    ):
        """Notify driver that an order has been reassigned to another driver."""
        title = "Order Reassigned"
        body = f"Order {order_number} has been reassigned to another driver."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={
                "type": "order_reassigned",
                "order_id": str(order_id),
                "order_number": order_number,
            },
            created_at=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if token else None,
        )
        db.add(notif)

        if token:
            result = await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "order_reassigned",
                    "order_id": str(order_id),
                    "order_number": order_number,
                },
            )
            if result == "INVALID_TOKEN":
                await self._clear_invalid_token(db, user_id)

    async def notify_admins_order_assigned(
        self,
        db: AsyncSession,
        order_id: int,
        order_number: str,
        driver_name: str,
        assigned_by_name: str,
    ):
        """
        Notify all admin/manager users about an order assignment.
        This creates notifications visible in the admin dashboard.
        """
        from app.models.user import User, UserRole
        from sqlalchemy import select

        title = "Order Assigned"
        body = f"Order {order_number} assigned to {driver_name} by {assigned_by_name}"

        # Get all admin and manager users
        admin_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.DISPATCHER]
        stmt = select(User).where(User.role.in_(admin_roles), User.is_active.is_(True))
        result = await db.execute(stmt)
        admin_users = result.scalars().all()

        for user in admin_users:
            notif = Notification(
                user_id=user.id,
                title=title,
                body=body,
                data={
                    "type": "order",
                    "order_id": str(order_id),
                    "order_number": order_number,
                    "driver_name": driver_name,
                    "assigned_by": assigned_by_name,
                },
                created_at=datetime.now(timezone.utc),
            )
            db.add(notif)

    async def subscribe_to_warehouse_topic(self, token: str, warehouse_id: int) -> bool:
        """
        Subscribe a device token to a warehouse topic.

        This allows sending broadcast notifications to all devices
        subscribed to a specific warehouse (e.g., all drivers in that warehouse).

        Args:
            token: The FCM device token to subscribe
            warehouse_id: The warehouse ID to create/subscribe to topic

        Returns:
            True if subscription succeeded, False otherwise
        """
        topic = f"warehouse_{warehouse_id}"
        try:
            if not firebase_admin._apps:
                logger.debug(f"[MOCK FCM] Subscribing token to topic {topic}")
                return True

            response = messaging.subscribe_to_topic([token], topic)
            if response.success_count > 0:
                logger.info(f"[FCM] Token subscribed to topic {topic}")
                return True
            else:
                logger.warning(f"[FCM] Failed to subscribe to topic {topic}: {response.errors}")
                return False
        except Exception as e:
            logger.error(f"[FCM Error] subscribe_to_warehouse_topic: {e}")
            return False

    async def unsubscribe_from_warehouse_topic(self, token: str, warehouse_id: int) -> bool:
        """
        Unsubscribe a device token from a warehouse topic.

        Args:
            token: The FCM device token to unsubscribe
            warehouse_id: The warehouse ID topic to unsubscribe from

        Returns:
            True if unsubscription succeeded, False otherwise
        """
        topic = f"warehouse_{warehouse_id}"
        try:
            if not firebase_admin._apps:
                logger.debug(f"[MOCK FCM] Unsubscribing token from topic {topic}")
                return True

            response = messaging.unsubscribe_from_topic([token], topic)
            if response.success_count > 0:
                logger.info(f"[FCM] Token unsubscribed from topic {topic}")
                return True
            else:
                logger.warning(f"[FCM] Failed to unsubscribe from topic {topic}: {response.errors}")
                return False
        except Exception as e:
            logger.error(f"[FCM Error] unsubscribe_from_warehouse_topic: {e}")
            return False

    async def broadcast_to_warehouse(
        self,
        warehouse_id: int,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Send a notification to all devices subscribed to a warehouse topic.

        This broadcasts to all drivers and staff in the specified warehouse.

        Args:
            warehouse_id: The warehouse ID to broadcast to
            title: Notification title
            body: Notification body text
            data: Optional data payload

        Returns:
            Message ID if successful, None otherwise
        """
        topic = f"warehouse_{warehouse_id}"
        return await self.send_to_topic(topic, title, body, data)

    async def broadcast_new_orders_to_warehouse(
        self,
        warehouse_id: int,
        count: int,
    ) -> Optional[str]:
        """
        Broadcast a notification about new orders to all drivers in a warehouse.

        Args:
            warehouse_id: The warehouse ID to broadcast to
            count: Number of new orders

        Returns:
            Message ID if successful, None otherwise
        """
        title = "New Orders Available"
        body = f"{count} new order(s) are available for pickup."
        data = {"type": "new_orders_available", "count": str(count)}
        return await self.broadcast_to_warehouse(warehouse_id, title, body, data)


notification_service = NotificationService()
