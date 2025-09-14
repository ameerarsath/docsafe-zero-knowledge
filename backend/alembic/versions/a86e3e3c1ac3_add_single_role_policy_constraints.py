"""add_single_role_policy_constraints

This migration adds database constraints to enforce the single-role policy:
1. Partial unique constraint ensuring only one active role per user
2. Check constraint ensuring is_primary is only true for active roles
3. Clean up any existing violations before applying constraints

Revision ID: a86e3e3c1ac3
Revises: fde1840e117f
Create Date: 2025-09-12 09:18:29.357860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a86e3e3c1ac3'
down_revision: Union[str, None] = 'fde1840e117f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply database constraints for single-role policy."""
    
    # Step 1: Clean up any existing violations
    # First, mark all roles as inactive except the most recent one for each user
    op.execute("""
        UPDATE user_roles 
        SET is_active = false 
        WHERE (user_id, assigned_at) NOT IN (
            SELECT user_id, MAX(assigned_at) 
            FROM user_roles 
            WHERE is_active = true 
            GROUP BY user_id
        ) AND is_active = true;
    """)
    
    # Step 2: Ensure only one primary role per user (the active one)
    op.execute("""
        UPDATE user_roles 
        SET is_primary = false 
        WHERE is_active = false AND is_primary = true;
    """)
    
    # Step 3: Add the basic unique constraint if it doesn't exist
    try:
        op.create_unique_constraint('uq_user_role', 'user_roles', ['user_id', 'role_id'])
    except Exception:
        # Constraint might already exist, skip
        pass
    
    # Step 4: Add partial unique constraint for single active role per user
    # This ensures only one active role per user
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_single_active_role 
        ON user_roles (user_id) 
        WHERE is_active = true;
    """)
    
    # Step 5: Add partial unique constraint for single primary role per user  
    # This ensures only one primary role per user
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_single_primary_role 
        ON user_roles (user_id) 
        WHERE is_primary = true;
    """)
    
    # Step 6: Add check constraint to ensure primary roles are active
    op.execute("""
        ALTER TABLE user_roles 
        ADD CONSTRAINT chk_primary_role_is_active 
        CHECK (NOT is_primary OR is_active);
    """)
    
    # Step 7: Add check constraint to prevent expired active roles
    op.execute("""
        ALTER TABLE user_roles 
        ADD CONSTRAINT chk_active_role_not_expired 
        CHECK (NOT is_active OR expires_at IS NULL OR expires_at > NOW());
    """)
    
    # Step 8: Add a trigger function to automatically deactivate expired roles
    op.execute("""
        CREATE OR REPLACE FUNCTION deactivate_expired_roles()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Deactivate expired roles
            UPDATE user_roles 
            SET is_active = false, is_primary = false
            WHERE is_active = true 
              AND expires_at IS NOT NULL 
              AND expires_at <= NOW();
            
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    # Step 9: Create trigger to run the function
    op.execute("""
        CREATE TRIGGER trigger_deactivate_expired_roles
            AFTER INSERT OR UPDATE ON user_roles
            FOR EACH STATEMENT
            EXECUTE FUNCTION deactivate_expired_roles();
    """)


def downgrade() -> None:
    """Remove single-role policy constraints."""
    
    # Remove trigger and function
    op.execute("DROP TRIGGER IF EXISTS trigger_deactivate_expired_roles ON user_roles;")
    op.execute("DROP FUNCTION IF EXISTS deactivate_expired_roles();")
    
    # Remove check constraints
    op.execute("ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS chk_active_role_not_expired;")
    op.execute("ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS chk_primary_role_is_active;")
    
    # Remove partial unique indexes
    op.execute("DROP INDEX IF EXISTS idx_user_single_primary_role;")
    op.execute("DROP INDEX IF EXISTS idx_user_single_active_role;")
    
    # Remove basic unique constraint
    try:
        op.drop_constraint('uq_user_role', 'user_roles', type_='unique')
    except Exception:
        # Constraint might not exist, skip
        pass
