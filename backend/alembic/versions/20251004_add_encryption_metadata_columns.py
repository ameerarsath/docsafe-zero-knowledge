"""Add encryption_salt and encryption_key columns to documents

Revision ID: 20251004_add_encryption_metadata
Revises: 20251002_normalize
Create Date: 2025-10-04

This migration adds the missing encryption metadata columns to the documents table.
These columns are required for zero-knowledge encryption to work properly with
external shares and preview functionality.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = '20251004_add_encryption_metadata'
down_revision = '20251002_normalize'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add encryption_salt and encryption_key columns to documents table.

    These columns are required for:
    1. Zero-knowledge encryption (encryption_salt for key derivation)
    2. Storing encrypted document content (encryption_key as LargeBinary)
    """
    conn = op.get_bind()

    # Check if columns already exist
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('documents')]

    # Add encryption_salt if it doesn't exist (LargeBinary for bytes storage)
    if 'encryption_salt' not in existing_columns:
        print("Adding encryption_salt column...")
        op.add_column('documents', sa.Column('encryption_salt', sa.LargeBinary(), nullable=True))
        print("[OK] Added encryption_salt column")
    else:
        print("[INFO] encryption_salt column already exists")

    # Add encryption_key if it doesn't exist (LargeBinary for encrypted content)
    if 'encryption_key' not in existing_columns:
        print("Adding encryption_key column...")
        op.add_column('documents', sa.Column('encryption_key', sa.LargeBinary(), nullable=True))
        print("[OK] Added encryption_key column")
    else:
        print("[INFO] encryption_key column already exists")

    # Migrate data from old 'salt' column if it exists
    if 'salt' in existing_columns and 'encryption_salt' in existing_columns:
        print("Migrating data from 'salt' to 'encryption_salt'...")

        # For PostgreSQL, we need to decode base64 and store as bytea
        # For SQLite, we can store the string directly as blob
        dialect_name = conn.dialect.name

        if dialect_name == 'postgresql':
            # PostgreSQL: decode base64 string to bytea
            migrate_query = text("""
                UPDATE documents
                SET encryption_salt = decode(salt, 'base64')
                WHERE salt IS NOT NULL
                AND encryption_salt IS NULL
            """)
        else:
            # SQLite: store as blob (will need base64 decode in application)
            migrate_query = text("""
                UPDATE documents
                SET encryption_salt = CAST(salt AS BLOB)
                WHERE salt IS NOT NULL
                AND encryption_salt IS NULL
            """)

        result = conn.execute(migrate_query)
        rows_migrated = result.rowcount
        print(f"[OK] Migrated {rows_migrated} rows from 'salt' to 'encryption_salt'")

        # Drop old salt column after migration
        print("Dropping old 'salt' column...")
        op.drop_column('documents', 'salt')
        print("[OK] Dropped old 'salt' column")

    # Migrate data from old 'ciphertext' column if it exists
    if 'ciphertext' in existing_columns and 'encryption_key' in existing_columns:
        print("Migrating data from 'ciphertext' to 'encryption_key'...")

        dialect_name = conn.dialect.name

        if dialect_name == 'postgresql':
            # PostgreSQL: convert text to bytea if needed
            migrate_query = text("""
                UPDATE documents
                SET encryption_key = decode(ciphertext, 'base64')
                WHERE ciphertext IS NOT NULL
                AND encryption_key IS NULL
            """)
        else:
            # SQLite: cast to blob
            migrate_query = text("""
                UPDATE documents
                SET encryption_key = CAST(ciphertext AS BLOB)
                WHERE ciphertext IS NOT NULL
                AND encryption_key IS NULL
            """)

        result = conn.execute(migrate_query)
        rows_migrated = result.rowcount
        print(f"[OK] Migrated {rows_migrated} rows from 'ciphertext' to 'encryption_key'")

        # Drop old ciphertext column after migration
        print("Dropping old 'ciphertext' column...")
        op.drop_column('documents', 'ciphertext')
        print("[OK] Dropped old 'ciphertext' column")

    # Report on documents that need attention
    check_query = text("""
        SELECT COUNT(*) as count
        FROM documents
        WHERE is_encrypted = TRUE
        AND (encryption_salt IS NULL OR encryption_iv IS NULL)
        AND encrypted_dek IS NOT NULL
    """)

    result = conn.execute(check_query)
    missing_metadata = result.scalar()

    if missing_metadata > 0:
        print(f"[WARN] {missing_metadata} encrypted documents still missing encryption metadata")
        print(f"   These documents were encrypted but salt/IV were not stored during upload")
        print(f"   External share preview will not work until metadata is restored")
        print(f"   Run data recovery script or re-upload documents with proper encryption metadata")


def downgrade():
    """
    Downgrade is complex due to data migration.
    Only remove the new columns if absolutely necessary.
    """
    # Re-create old columns
    op.add_column('documents', sa.Column('salt', sa.String(255), nullable=True))
    op.add_column('documents', sa.Column('ciphertext', sa.Text(), nullable=True))

    # Migrate data back (will lose binary precision)
    conn = op.get_bind()

    # Migrate encryption_salt back to salt as base64 string
    migrate_salt_query = text("""
        UPDATE documents
        SET salt = encode(encryption_salt, 'base64')
        WHERE encryption_salt IS NOT NULL
    """)
    conn.execute(migrate_salt_query)

    # Migrate encryption_key back to ciphertext as base64 string
    migrate_key_query = text("""
        UPDATE documents
        SET ciphertext = encode(encryption_key, 'base64')
        WHERE encryption_key IS NOT NULL
    """)
    conn.execute(migrate_key_query)

    # Drop new columns
    op.drop_column('documents', 'encryption_key')
    op.drop_column('documents', 'encryption_salt')

    print("[WARN] Downgrade complete - data precision may be lost in conversion")
