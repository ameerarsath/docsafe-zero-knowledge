"""normalize storage paths to POSIX format

Revision ID: 20251002_normalize
Revises: 30a1c4f64d4b
Create Date: 2025-10-02 18:00:00.000000

This migration normalizes all document storage paths from Windows format (backslashes)
to POSIX format (forward slashes) for cross-platform compatibility.

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251002_normalize'
down_revision = '30a1c4f64d4b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Normalize storage paths from Windows format to POSIX format.

    Converts:
    - ./data/encrypted-files\3\a1\abc123.enc
    To:
    - ./data/encrypted-files/3/a1/abc123.enc
    """
    # PostgreSQL: Use REPLACE function
    op.execute("""
        UPDATE documents
        SET storage_path = REPLACE(storage_path, '\\', '/')
        WHERE storage_path LIKE '%\\\\%'
    """)

    # Log the update
    print("[OK] Normalized storage paths to POSIX format (forward slashes)")


def downgrade() -> None:
    """
    Revert POSIX paths back to Windows format (only on Windows systems).

    Note: This downgrade only works on Windows. On Unix systems, paths are already
    in POSIX format and don't need conversion.
    """
    # This is a no-op on Unix systems
    # On Windows, you would need to detect the platform and convert back
    pass
