"""Add delivered_at to orders

Revision ID: a8f3c2d91e57
Revises: 5642bd73b6d8
Create Date: 2026-02-04 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a8f3c2d91e57"
down_revision = "add_vehicle_type_to_driver"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add delivered_at column to order table
    # This column tracks when an order was marked as DELIVERED
    # Used for 24-hour archive buffer (orders are archived 24h after delivery)
    op.add_column(
        "order",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True)
    )
    # Add index for efficient queries on delivered_at
    op.create_index(
        op.f("ix_order_delivered_at"),
        "order",
        ["delivered_at"],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_order_delivered_at"), table_name="order")
    op.drop_column("order", "delivered_at")
