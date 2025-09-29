"""Add encryption_password to document_shares

Revision ID: add_encryption_password
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_encryption_password'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add encryption_password column to document_shares table."""
    op.add_column('document_shares', sa.Column('encryption_password', sa.String(255), nullable=True))


def downgrade():
    """Remove encryption_password column from document_shares table."""
    op.drop_column('document_shares', 'encryption_password')