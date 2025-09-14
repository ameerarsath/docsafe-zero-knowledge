"""Add automatic role synchronization trigger

Revision ID: role_sync_trigger
Revises:
Create Date: 2025-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'role_sync_trigger'
down_revision = None  # Update this with the latest migration
branch_labels = None
depends_on = None

def upgrade():
    """Add trigger to automatically sync users.role with user_roles assignments"""

    # Create function to sync user role
    op.execute("""
    CREATE OR REPLACE FUNCTION sync_user_role()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Update the users.role field to match the highest active role assignment
        UPDATE users
        SET role = (
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = COALESCE(NEW.user_id, OLD.user_id)
              AND ur.is_active = true
            ORDER BY ur.is_primary DESC, r.hierarchy_level DESC, ur.assigned_at DESC
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = COALESCE(NEW.user_id, OLD.user_id);

        -- If no active roles found, set to default 'viewer' role
        UPDATE users
        SET role = 'viewer', updated_at = CURRENT_TIMESTAMP
        WHERE id = COALESCE(NEW.user_id, OLD.user_id)
          AND role IS NULL;

        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
    """)

    # Create triggers for INSERT, UPDATE, DELETE on user_roles
    op.execute("""
    CREATE TRIGGER user_roles_sync_trigger
        AFTER INSERT OR UPDATE OR DELETE
        ON user_roles
        FOR EACH ROW
        EXECUTE FUNCTION sync_user_role();
    """)

    # Create comment for documentation
    op.execute("""
    COMMENT ON FUNCTION sync_user_role() IS
    'Automatically synchronizes users.role field with active role assignments in user_roles table';
    """)

def downgrade():
    """Remove the role synchronization trigger"""
    op.execute("DROP TRIGGER IF EXISTS user_roles_sync_trigger ON user_roles;")
    op.execute("DROP FUNCTION IF EXISTS sync_user_role();")