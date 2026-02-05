"""Add order timestamps, notes, sales_track; add driver code

Revision ID: b7e4d2f1a3c9
Revises: a8f3c2d91e57
Create Date: 2026-02-05 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7e4d2f1a3c9"
down_revision = "a8f3c2d91e57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Order: assigned_at timestamp
    op.add_column(
        "order",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_order_assigned_at"), "order", ["assigned_at"], unique=False
    )

    # Order: picked_up_at timestamp
    op.add_column(
        "order",
        sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Order: notes (free-text)
    op.add_column(
        "order",
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # Order: sales_track
    op.add_column(
        "order",
        sa.Column("sales_track", sa.String(), nullable=True),
    )

    # Driver: code (unique identifier)
    op.add_column(
        "driver",
        sa.Column("code", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_driver_code"), "driver", ["code"], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_driver_code"), table_name="driver")
    op.drop_column("driver", "code")
    op.drop_column("order", "sales_track")
    op.drop_column("order", "notes")
    op.drop_column("order", "picked_up_at")
    op.drop_index(op.f("ix_order_assigned_at"), table_name="order")
    op.drop_column("order", "assigned_at")
