"""Add vehicle_type field to driver

Revision ID: add_vehicle_type_to_driver
Revises: add_phone_field_to_user
Create Date: 2026-02-03

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_vehicle_type_to_driver"
down_revision = "add_phone_field_to_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("driver", sa.Column("vehicle_type", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("driver", "vehicle_type")
