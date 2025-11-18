"""Add share_encrypted_dek column to document_shares

Revision ID: 20251118_add_share_encrypted_dek
Revises: 20251004_add_encryption_metadata
Create Date: 2025-11-18

This migration adds the share_encrypted_dek column to the document_shares table.
This column stores the re-encrypted Document Encryption Key (DEK) for zero-knowledge
sharing, allowing recipients to decrypt shared documents without the server ever
having access to the plaintext encryption keys.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251118_add_share_encrypted_dek'
down_revision = '20251004_add_encryption_metadata'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add share_encrypted_dek column to document_shares table.

    This column stores a JSON object containing the re-encrypted DEK with:
    - ciphertext: The encrypted DEK (base64)
    - iv: Initialization vector (base64)
    - salt: PBKDF2 salt used for key derivation (base64)
    - iterations: PBKDF2 iteration count
    - tag: GCM authentication tag (base64)
    """
    conn = op.get_bind()

    # Check if column already exists
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('document_shares')]

    if 'share_encrypted_dek' not in existing_columns:
        print("Adding share_encrypted_dek column to document_shares...")
        op.add_column('document_shares', sa.Column('share_encrypted_dek', sa.Text(), nullable=True))
        print("[OK] Added share_encrypted_dek column")
    else:
        print("[INFO] share_encrypted_dek column already exists")


def downgrade():
    """Remove share_encrypted_dek column from document_shares table."""
    op.drop_column('document_shares', 'share_encrypted_dek')
    print("[OK] Removed share_encrypted_dek column")
