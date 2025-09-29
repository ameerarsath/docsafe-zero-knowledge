"""merge_encryption_updates

Revision ID: 26aad1922df0
Revises: add_salt_to_documents, fix_ciphertext_001
Create Date: 2025-09-28 12:04:08.517822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26aad1922df0'
down_revision: Union[str, None] = ('add_salt_to_documents', 'fix_ciphertext_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
