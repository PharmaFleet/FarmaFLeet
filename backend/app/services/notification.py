from typing import List, Optional, Dict, Any

import os
import json
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from datetime import datetime


class NotificationService:
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
                    print("[FCM] Firebase initialized successfully.")
                else:
                    print(
                        "[FCM] FIREBASE_CREDENTIALS_JSON not found. Running in mock mode."
                    )
        except Exception as e:
            print(f"[FCM] Failed to initialize Firebase: {e}")

    async def send_to_topic(
        self, topic: str, title: str, body: str, data: Optional[Dict[str, Any]] = None
    ):
        """Send a message to a topic."""
        try:
            if not firebase_admin._apps:
                print(f"[MOCK FCM] Sending to topic {topic}: {title} - {body}")
                return "mock-message-id"

            message = messaging.Message(
                topic=topic,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
            )
            response = messaging.send(message)
            return response
        except Exception as e:
            print(f"[FCM Error] send_to_topic: {e}")
            return None

    async def send_to_token(
        self, token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None
    ):
        """Send a message to a specific device token."""
        try:
            if not firebase_admin._apps:
                print(f"[MOCK FCM] Sending to token {token[:10]}...: {title} - {body}")
                return "mock-message-id"

            message = messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
            )
            response = messaging.send(message)
            return response
        except Exception as e:
            print(f"[FCM Error] send_to_token: {e}")
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
                print(f"[MOCK FCM] Sending to {len(tokens)} tokens: {title} - {body}")
                return "mock-batch-response-id"

            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
            )
            response = messaging.send_multicast(message)
            return response
        except Exception as e:
            print(f"[FCM Error] send_multicast: {e}")
            return None

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
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if token else None,
        )
        db.add(notif)
        # Note: caller should commit, but we can flush if needed.
        # Ideally we stick to caller commit pattern, but for notifications strictly,
        # sometimes we want them even if main tx fails? No, usually not.

        if token:
            await self.send_to_token(
                token, title, body, data={"type": "new_orders", "count": str(count)}
            )
        else:
            print(f"No token for user {user_id}, skipping push notification.")

    async def notify_driver_order_delivered(
        self, db: AsyncSession, user_id: int, order_id: int, token: Optional[str] = None
    ):
        """Notify driver that order is marked delivered."""
        title = "Order Delivered"
        body = f"Order #{order_id} has been successfully delivered."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={"type": "order_delivered", "order_id": str(order_id)},
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if token else None,
        )
        db.add(notif)

        if token:
            await self.send_to_token(
                token,
                title,
                body,
                data={"type": "order_delivered", "order_id": str(order_id)},
            )

    async def notify_driver_payment_collected(
        self,
        db: AsyncSession,
        user_id: int,
        order_id: int,
        amount: float,
        token: Optional[str] = None,
    ):
        """Notify driver about payment collection."""
        title = "Payment Collected"
        body = f"Please collect {amount:.2f} for Order #{order_id}."

        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            data={
                "type": "payment_collection",
                "order_id": str(order_id),
                "amount": str(amount),
            },
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if token else None,
        )
        db.add(notif)

        if token:
            await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "payment_collection",
                    "order_id": str(order_id),
                    "amount": str(amount),
                },
            )

    async def notify_driver_shift_limit(
        self, driver_id: int, token: Optional[str] = None
    ):
        """Notify driver about 12h shift limit."""
        title = "Shift Limit Reached"
        body = (
            "You have been online for 12 hours. Please confirm if your shift is over."
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
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if token else None,
        )
        db.add(notif)

        if token:
            await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "order_cancelled",
                    "order_id": str(order_id),
                    "order_number": order_number,
                },
            )

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
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow() if token else None,
        )
        db.add(notif)

        if token:
            await self.send_to_token(
                token,
                title,
                body,
                data={
                    "type": "order_reassigned",
                    "order_id": str(order_id),
                    "order_number": order_number,
                },
            )


notification_service = NotificationService()
