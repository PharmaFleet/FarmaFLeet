"""Add phone field to user

Revision ID: add_phone_field_to_user
Revises: 5642bd73b6d8
Create Date: 2026-02-02

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_phone_field_to_user"
down_revision = "5642bd73b6d8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("phone", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "phone")
