-- DocSafe Database Initialization Script
-- This script sets up the initial database structure and seed data

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for password encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set timezone
SET timezone = 'UTC';

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS docsafe;
SET search_path TO docsafe, public;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON SCHEMA docsafe TO securevault_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA docsafe TO securevault_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA docsafe TO securevault_user;

-- Future permissions for tables created later
ALTER DEFAULT PRIVILEGES IN SCHEMA docsafe GRANT ALL ON TABLES TO securevault_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA docsafe GRANT ALL ON SEQUENCES TO securevault_user;

-- Create application user with proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'docsafe_app') THEN
        CREATE ROLE docsafe_app WITH LOGIN PASSWORD 'docsafe_app_password';
        GRANT CONNECT ON DATABASE securevault TO docsafe_app;
        GRANT USAGE ON SCHEMA docsafe TO docsafe_app;
        GRANT CREATE ON SCHEMA docsafe TO docsafe_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA docsafe GRANT ALL ON TABLES TO docsafe_app;
        ALTER DEFAULT PRIVILEGES IN SCHEMA docsafe GRANT ALL ON SEQUENCES TO docsafe_app;
    END IF;
END
$$;

-- Create initial tables will be handled by Alembic migrations