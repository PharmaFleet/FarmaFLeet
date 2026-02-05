"""rename sales_track to sales_taker

Revision ID: c8f3a1b2d4e5
Revises: b7e4d2f1a3c9
Create Date: 2026-02-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c8f3a1b2d4e5'
down_revision = 'b7e4d2f1a3c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('order', 'sales_track', new_column_name='sales_taker')


def downgrade() -> None:
    op.alter_column('order', 'sales_taker', new_column_name='sales_track')
