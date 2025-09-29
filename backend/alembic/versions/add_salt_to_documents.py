"""Add salt field to documents

Revision ID: add_salt_to_documents
Revises: add_encryption_password
Create Date: 2024-01-01 12:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_salt_to_documents'
down_revision = 'add_encryption_password'
branch_labels = None
depends_on = None


def upgrade():
    """Add salt column to documents table."""
    op.add_column('documents', sa.Column('salt', sa.String(255), nullable=True))


def downgrade():
    """Remove salt column from documents table."""
    op.drop_column('documents', 'salt')