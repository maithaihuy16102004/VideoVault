-- ============================================
-- VideoVault SaaS Platform - Database Initialization
-- ============================================

-- Create database (if not exists)
-- Note: This is handled by POSTGRES_DB environment variable
-- but we can ensure extensions are created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Create a dedicated user for the application (optional, using postgres for simplicity)
-- CREATE USER videovault WITH PASSWORD 'secure_password_here';
-- GRANT ALL PRIVILEGES ON DATABASE videovault TO videovault;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'VideoVault database initialized successfully!';
END $$;
