"""
Proof of Delivery Service

Handles POD upload, URL generation, and validation.
Consolidates duplicated POD logic from orders.py endpoints.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.order import Order, OrderStatus, ProofOfDelivery
from app.models.financial import PaymentCollection, PaymentMethod
from app.services.storage import storage_service
from app.services.notification import notification_service
from app.services.order_status import order_status_service

logger = logging.getLogger(__name__)


class ProofOfDeliveryService:
    """Service for handling Proof of Delivery operations."""

    async def upload_photo(
        self,
        order_id: int,
        photo_content: bytes,
        content_type: str = "image/jpeg",
    ) -> Optional[str]:
        """
        Upload a POD photo to Supabase storage.

        Args:
            order_id: The order ID for organizing storage
            photo_content: Raw bytes of the photo
            content_type: MIME type of the photo

        Returns:
            Public URL of the uploaded photo, or None if upload failed
        """
        filename = f"orders/{order_id}/photo_{uuid.uuid4()}.jpg"
        return await storage_service.upload_file(
            file_content=photo_content,
            file_name=filename,
            content_type=content_type,
        )

    def create_or_update_pod(
        self,
        db: AsyncSession,
        order: Order,
        photo_url: Optional[str] = None,
        signature_url: Optional[str] = None,
    ) -> ProofOfDelivery:
        """
        Create or update POD record for an order.

        Args:
            db: Database session
            order: Order object (must have proof_of_delivery loaded)
            photo_url: URL of the POD photo
            signature_url: URL of the signature

        Returns:
            The created or updated ProofOfDelivery object
        """
        if order.proof_of_delivery:
            # Update existing POD
            if photo_url:
                order.proof_of_delivery.photo_url = photo_url
            if signature_url:
                order.proof_of_delivery.signature_url = signature_url
            order.proof_of_delivery.timestamp = datetime.now(timezone.utc)
            return order.proof_of_delivery
        else:
            # Create new POD
            pod = ProofOfDelivery(
                order_id=order.id,
                photo_url=photo_url,
                signature_url=signature_url,
            )
            db.add(pod)
            return pod

    async def complete_delivery(
        self,
        db: AsyncSession,
        order: Order,
        photo_url: Optional[str] = None,
        signature_url: Optional[str] = None,
        notes: str = "Proof of delivery submitted",
    ) -> None:
        """
        Complete delivery with optional POD.

        Updates order status to DELIVERED, creates status history,
        and handles POD if provided.

        Args:
            db: Database session
            order: Order object (must have proof_of_delivery loaded)
            photo_url: Optional URL of the POD photo
            signature_url: Optional URL of the signature
            notes: Notes for the status history
        """
        # Create or update POD if any proof provided
        if photo_url or signature_url:
            self.create_or_update_pod(db, order, photo_url, signature_url)

        # Update order status using the centralized service
        history = order_status_service.apply_status(order, OrderStatus.DELIVERED, notes)
        db.add(history)

    async def process_post_delivery(
        self,
        db: AsyncSession,
        order: Order,
    ) -> None:
        """
        Process post-delivery actions: notifications and payment collection.

        This should be called after committing the delivery, wrapped in try/except
        to not fail the whole request on notification errors.

        Args:
            db: Database session
            order: Order object (must have driver.user loaded)
        """
        if not order.driver or not order.driver.user:
            return

        driver_user = order.driver.user

        # Notify driver about delivery
        if driver_user.fcm_token:
            await notification_service.notify_driver_order_delivered(
                db, driver_user.id, order.id, driver_user.fcm_token
            )

        # Handle payment collection for COD orders
        if (
            order.payment_method
            and order.payment_method.upper() in ["CASH", "COD"]
            and order.total_amount > 0
        ):
            await self._create_payment_collection(db, order)

    async def _create_payment_collection(
        self,
        db: AsyncSession,
        order: Order,
    ) -> None:
        """
        Create payment collection record if it doesn't exist.

        Args:
            db: Database session
            order: Order object (must have driver.user loaded)
        """
        # Check if payment already exists
        existing_payment = await db.execute(
            select(PaymentCollection).where(PaymentCollection.order_id == order.id)
        )
        if existing_payment.scalars().first():
            return

        # Create payment collection
        method_enum = PaymentMethod(order.payment_method.upper())
        payment = PaymentCollection(
            order_id=order.id,
            driver_id=order.driver_id,
            amount=order.total_amount,
            method=method_enum,
            collected_at=datetime.now(timezone.utc),
        )
        db.add(payment)

        # Notify driver about payment collection
        if order.driver and order.driver.user and order.driver.user.fcm_token:
            await notification_service.notify_driver_payment_collected(
                db,
                order.driver.user_id,
                order.id,
                order.total_amount,
                order.driver.user.fcm_token,
            )

    def validate_pod_urls(
        self,
        photo_url: Optional[str] = None,
        signature_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validate POD URLs.

        Args:
            photo_url: URL of the POD photo
            signature_url: URL of the signature

        Returns:
            Dict with 'valid' boolean and 'errors' list
        """
        errors = []

        # Basic URL validation
        if photo_url and not photo_url.startswith(("http://", "https://")):
            errors.append("Invalid photo URL format")

        if signature_url and not signature_url.startswith(
            ("http://", "https://", "data:")
        ):
            # Allow data URLs for base64 signatures
            errors.append("Invalid signature URL format")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
        }


# Singleton instance
pod_service = ProofOfDeliveryService()
