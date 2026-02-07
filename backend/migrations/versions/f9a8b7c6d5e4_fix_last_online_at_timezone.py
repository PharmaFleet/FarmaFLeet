"""Fix last_online_at to use timezone-aware datetime

Revision ID: f9a8b7c6d5e4
Revises: 5642bd73b6d8
Create Date: 2026-02-07 18:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f9a8b7c6d5e4"
down_revision = "c8f3a1b2d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change last_online_at from TIMESTAMP WITHOUT TIME ZONE to TIMESTAMP WITH TIME ZONE
    op.alter_column(
        "driver",
        "last_online_at",
        existing_type=sa.DateTime(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "driver",
        "last_online_at",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(),
        existing_nullable=True,
    )
