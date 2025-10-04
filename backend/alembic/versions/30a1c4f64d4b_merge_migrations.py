"""merge migrations

Revision ID: 30a1c4f64d4b
Revises: 4fc4dab4fda6
Create Date: 2025-10-02 09:48:48.933153

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30a1c4f64d4b'
down_revision: Union[str, None] = '4fc4dab4fda6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
