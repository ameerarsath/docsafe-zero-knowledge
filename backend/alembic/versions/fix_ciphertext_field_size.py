"""Fix ciphertext field size and add encryption fields

Revision ID: fix_ciphertext_001
Revises: fde1840e117f
Create Date: 2024-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fix_ciphertext_001'
down_revision: Union[str, None] = 'a86e3e3c1ac3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = ['role_sync_trigger']


def upgrade() -> None:
    # Add ciphertext column if it doesn't exist
    try:
        op.add_column('documents', sa.Column('ciphertext', sa.Text(), nullable=True))
    except Exception:
        # Column might already exist, continue
        pass

    # Change encryption_iv from LargeBinary to String if needed
    try:
        op.alter_column('documents', 'encryption_iv',
                       existing_type=sa.LargeBinary(16),
                       type_=sa.String(255),
                       existing_nullable=True)
    except Exception:
        # Column might already be String, continue
        pass

    # Change encryption_auth_tag from LargeBinary to String if needed
    try:
        op.alter_column('documents', 'encryption_auth_tag',
                       existing_type=sa.LargeBinary(16),
                       type_=sa.String(255),
                       existing_nullable=True)
    except Exception:
        # Column might already be String, continue
        pass


def downgrade() -> None:
    # Revert changes (data may be lost)
    try:
        op.alter_column('documents', 'encryption_iv',
                       existing_type=sa.String(255),
                       type_=sa.LargeBinary(16),
                       existing_nullable=True)
    except Exception:
        pass

    try:
        op.alter_column('documents', 'encryption_auth_tag',
                       existing_type=sa.String(255),
                       type_=sa.LargeBinary(16),
                       existing_nullable=True)
    except Exception:
        pass

    try:
        op.drop_column('documents', 'ciphertext')
    except Exception:
        pass