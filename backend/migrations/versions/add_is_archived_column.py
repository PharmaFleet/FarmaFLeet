"""Add is_archived column to Order table

Revision ID: add_is_archived_column
Revises: 0ad0e83f95f1
Create Date: 2026-01-27

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_is_archived_column"
down_revision = "0ad0e83f95f1"
branch_labels = None
depends_on = None


def upgrade():
    # Add is_archived column with default False
    op.add_column(
        "order",
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Create index for efficient filtering
    op.create_index("ix_order_is_archived", "order", ["is_archived"])


def downgrade():
    op.drop_index("ix_order_is_archived", "order")
    op.drop_column("order", "is_archived")
