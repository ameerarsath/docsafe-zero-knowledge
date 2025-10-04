"""merge encryption metadata migrations

Revision ID: d6b6a181f87c
Revises: backfill_encryption_key_id, 20251004_add_encryption_metadata, role_sync_trigger
Create Date: 2025-10-04 13:09:15.036975

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6b6a181f87c'
down_revision: Union[str, None] = ('backfill_encryption_key_id', '20251004_add_encryption_metadata', 'role_sync_trigger')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
