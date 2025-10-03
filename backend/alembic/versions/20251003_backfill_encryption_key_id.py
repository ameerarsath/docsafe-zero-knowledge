"""Backfill encryption_key_id for existing documents

Revision ID: backfill_encryption_key_id
Revises:
Create Date: 2025-10-03

This migration updates existing documents that are missing encryption_key_id
by setting it to the user's active encryption key.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = 'backfill_encryption_key_id'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Backfill encryption_key_id for documents that are encrypted but missing the key ID.
    Sets encryption_key_id to the user's active encryption key.
    """
    # Get database connection
    conn = op.get_bind()

    # Update documents that:
    # 1. Have encrypted_dek (are encrypted with zero-knowledge)
    # 2. Are missing encryption_key_id
    # 3. Have an owner with an active encryption key

    update_query = text("""
        UPDATE documents d
        SET encryption_key_id = (
            SELECT k.key_id
            FROM encryption_keys k
            WHERE k.user_id = d.owner_id
            AND k.is_active = TRUE
            LIMIT 1
        )
        WHERE d.encrypted_dek IS NOT NULL
        AND d.is_encrypted = TRUE
        AND (d.encryption_key_id IS NULL OR d.encryption_key_id = '')
        AND EXISTS (
            SELECT 1 FROM encryption_keys k
            WHERE k.user_id = d.owner_id
            AND k.is_active = TRUE
        )
    """)

    result = conn.execute(update_query)
    rows_updated = result.rowcount

    print(f"✅ Migration complete: Updated {rows_updated} documents with encryption_key_id")

    # Log documents that still don't have encryption_key_id (users without active keys)
    check_query = text("""
        SELECT COUNT(*) as count
        FROM documents
        WHERE encrypted_dek IS NOT NULL
        AND is_encrypted = TRUE
        AND (encryption_key_id IS NULL OR encryption_key_id = '')
    """)

    result = conn.execute(check_query)
    remaining = result.scalar()

    if remaining > 0:
        print(f"⚠️  Warning: {remaining} encrypted documents still missing encryption_key_id")
        print(f"   These documents belong to users without active encryption keys")
        print(f"   Decryption will use multi-key fallback logic")


def downgrade():
    """
    Downgrade is intentionally left empty as backfilling data
    should not be reversed (it doesn't modify schema).
    """
    pass
