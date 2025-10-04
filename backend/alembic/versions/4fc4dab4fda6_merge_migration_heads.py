"""merge migration heads

Revision ID: 4fc4dab4fda6
Revises: 26aad1922df0
Create Date: 2025-10-01 18:45:03.199981

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4fc4dab4fda6'
down_revision: Union[str, None] = '26aad1922df0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
