-- SecureVault Database Initialization Script
-- This script sets up the initial database structure and seed data

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for password encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set timezone
SET timezone = 'UTC';

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS securevault;
SET search_path TO securevault, public;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON SCHEMA securevault TO securevault_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA securevault TO securevault_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA securevault TO securevault_user;

-- Future permissions for tables created later
ALTER DEFAULT PRIVILEGES IN SCHEMA securevault GRANT ALL ON TABLES TO securevault_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA securevault GRANT ALL ON SEQUENCES TO securevault_user;