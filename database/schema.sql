-- ===========================================
-- VideoVault SaaS Platform - Database Schema v2.1
-- PostgreSQL 16+ Optimized (18 improvements applied)
-- EF Core Compatible (VARCHAR + CHECK instead of ENUM)
-- ===========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================================
-- 1. USERS TABLE — #9 CHECK constraint, #12 avatar CHECK, #13 email CHECK
-- ===========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL
        CONSTRAINT chk_users_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT
        CONSTRAINT chk_users_avatar_url CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),

    -- Role & Status — #9 VARCHAR + CHECK (EF Core compatible)
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CONSTRAINT chk_users_role CHECK (role IN ('admin', 'moderator', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,

    -- Subscription info
    subscription_plan_id UUID,
    quota_used INTEGER NOT NULL DEFAULT 0 CHECK (quota_used >= 0),
    quota_total INTEGER NOT NULL DEFAULT 10 CHECK (quota_total >= 0),
    quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day'),

    -- Timestamps — #14 UTC timezone
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- OAuth providers (JSONB for flexibility)
    oauth_providers JSONB DEFAULT '[]'::jsonb
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_subscription ON users(subscription_plan_id);

-- ===========================================
-- 2. SUBSCRIPTION PLANS TABLE — #6 NUMERIC(12,2), #7 GIN index
-- ===========================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Pricing — #6 NUMERIC(12,2) for larger amounts
    price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    price_yearly NUMERIC(12,2),

    -- Limits
    quota_limit INTEGER NOT NULL CHECK (quota_limit >= 0),
    quota_period VARCHAR(10) NOT NULL DEFAULT 'daily',
    max_video_duration INTEGER CHECK (max_video_duration IS NULL OR max_video_duration > 0),
    max_video_quality VARCHAR(20) DEFAULT '1080p',
    max_concurrent_downloads INTEGER DEFAULT 3 CHECK (max_concurrent_downloads > 0),

    -- Features (JSONB + GIN index) — #7
    features JSONB NOT NULL DEFAULT '["basic_download"]'::jsonb,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_sort ON subscription_plans(sort_order);
CREATE INDEX idx_subscription_plans_features ON subscription_plans USING GIN (features);  -- #7

-- Seed default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, quota_limit, quota_period, features, sort_order) VALUES
('free',       'Free',       'Basic video downloads with limited quota',          0.00, 10,   'daily', '["basic_download"]'::jsonb, 0),
('basic',      'Basic',      'Enhanced downloads with no watermark',              9.99, 50,   'daily', '["basic_download","no_watermark","standard_quality"]'::jsonb, 1),
('pro',        'Pro',        'Professional features with priority support',       29.99, 200, 'daily', '["basic_download","no_watermark","high_quality","priority_support","batch_download"]'::jsonb, 2),
('enterprise', 'Enterprise', 'Unlimited access with API and team features',       99.99, 1000, 'daily', '["basic_download","no_watermark","high_quality","4k_quality","priority_support","batch_download","api_access","team_management"]'::jsonb, 3);

-- ===========================================
-- 3. USER SUBSCRIPTIONS TABLE — #1 ON DELETE/UPDATE CASCADE
-- ===========================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON UPDATE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CONSTRAINT chk_user_subscriptions_status CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',

    started_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    payment_method VARCHAR(50),
    payment_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- ===========================================
-- 4. DOWNLOAD JOBS TABLE — #1 FK, #3 file CHECK, #4 SMALLINT, #5 retry CHECK, #11 CHECK
-- ===========================================
CREATE TABLE download_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- Video info
    original_url TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    video_id VARCHAR(100),

    -- Metadata
    title VARCHAR(500),
    description TEXT,
    duration INTEGER CHECK (duration IS NULL OR duration > 0),
    thumbnail_url TEXT,

    -- Download details
    quality VARCHAR(20) DEFAULT 'auto',
    file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    file_url TEXT,
    file_path TEXT,

    -- Status & Progress — #4 SMALLINT, #11 CHECK constraint for status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_download_jobs_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress SMALLINT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,

    -- #3: At least one storage info when completed
    CONSTRAINT chk_download_jobs_file_storage CHECK (
        status != 'completed' OR file_path IS NOT NULL OR file_url IS NOT NULL
    ),

    -- Technical — #11 CHECK constraint for video_format
    download_method VARCHAR(20) DEFAULT 'auto',
    video_format VARCHAR(10) DEFAULT 'mp4'
        CONSTRAINT chk_download_jobs_format CHECK (video_format IN ('mp4', 'webm', 'mkv')),

    -- Timestamps — #14 UTC
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Retry — #5 CHECK constraints
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0)
);

-- Indexes for download_jobs
CREATE INDEX idx_download_jobs_user_id ON download_jobs(user_id);
CREATE INDEX idx_download_jobs_status ON download_jobs(status);
CREATE INDEX idx_download_jobs_platform ON download_jobs(platform);
CREATE INDEX idx_download_jobs_user_status ON download_jobs(user_id, status);
CREATE INDEX idx_download_jobs_created_at ON download_jobs(created_at DESC);
CREATE INDEX idx_download_jobs_video_id ON download_jobs(video_id);

-- Partial index for active jobs (performance optimization)
CREATE INDEX idx_download_jobs_active ON download_jobs(user_id, created_at)
WHERE status IN ('pending', 'processing');

-- ===========================================
-- 5. PAYMENTS TABLE — #6 NUMERIC(12,2)
-- ===========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE,

    -- Payment details — #6 NUMERIC(12,2)
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_payments_status CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

    -- External references
    transaction_id VARCHAR(255) UNIQUE,
    payment_intent_id VARCHAR(255),

    -- Metadata — #7 GIN index below
    payment_metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

-- ===========================================
-- 6. VIDEO METADATA TABLE
-- ===========================================
CREATE TABLE video_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL,
    video_id VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,

    title VARCHAR(500),
    description TEXT,
    duration INTEGER CHECK (duration IS NULL OR duration > 0),
    thumbnail_url TEXT,
    author VARCHAR(255),
    view_count BIGINT CHECK (view_count IS NULL OR view_count >= 0),
    like_count BIGINT CHECK (like_count IS NULL OR like_count >= 0),

    -- Available qualities (JSONB + GIN) — #7
    available_qualities JSONB DEFAULT '[]'::jsonb,

    cached_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC' + INTERVAL '7 days'),

    UNIQUE(platform, video_id)
);

CREATE INDEX idx_video_metadata_platform ON video_metadata(platform);
CREATE INDEX idx_video_metadata_video_id ON video_metadata(video_id);
CREATE INDEX idx_video_metadata_expires ON video_metadata(expires_at);
CREATE INDEX idx_video_metadata_qualities ON video_metadata USING GIN (available_qualities);  -- #7

-- ===========================================
-- 7. AUDIT LOGS TABLE — #7 GIN on metadata, #15 index on ip_address
-- ===========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,

    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50),
    entity_id UUID,

    description TEXT,
    ip_address INET,
    user_agent TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);        -- #15
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata); -- #7

-- ===========================================
-- 8. RATE LIMITING TABLE
-- ===========================================
CREATE TABLE rate_limit_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,

    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1 CHECK (request_count >= 0),
    window_start TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- ===========================================
-- VIEWS — #16 materialized view for stats
-- ===========================================

-- Regular view for user download stats
CREATE VIEW v_user_download_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COUNT(dj.id) AS total_downloads,
    COUNT(CASE WHEN dj.status = 'completed' THEN 1 END) AS successful_downloads,
    COUNT(CASE WHEN dj.status = 'failed' THEN 1 END) AS failed_downloads,
    SUM(dj.file_size) AS total_bytes_downloaded,
    MAX(dj.created_at) AS last_download_at
FROM users u
LEFT JOIN download_jobs dj ON u.id = dj.user_id
GROUP BY u.id, u.username, u.email;

-- #16: Materialized view for platform analytics
CREATE MATERIALIZED VIEW mv_platform_stats AS
SELECT
    platform,
    COUNT(*) AS total_downloads,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
    ROUND(AVG(CASE WHEN status = 'completed' THEN progress END), 1) AS avg_progress,
    SUM(file_size) AS total_size,
    MIN(created_at) AS first_download_at,
    MAX(created_at) AS last_download_at
FROM download_jobs
GROUP BY platform
ORDER BY total_downloads DESC;

CREATE UNIQUE INDEX idx_mv_platform_stats_platform ON mv_platform_stats(platform);

-- Revenue summary (materialized)
CREATE MATERIALIZED VIEW mv_revenue_summary AS
SELECT
    DATE_TRUNC('month', created_at) AS month,
    currency,
    COUNT(*) AS total_transactions,
    SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) AS total_revenue,
    SUM(CASE WHEN payment_status = 'refunded' THEN amount ELSE 0 END) AS total_refunds,
    COUNT(DISTINCT user_id) AS unique_paying_users
FROM payments
GROUP BY DATE_TRUNC('month', created_at), currency
ORDER BY month DESC;

CREATE UNIQUE INDEX idx_mv_revenue_month ON mv_revenue_summary(month, currency);

-- ===========================================
-- FUNCTIONS — #2 Race condition fix with FOR UPDATE
-- ===========================================

CREATE OR REPLACE FUNCTION check_and_increment_quota(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_used INTEGER;
    v_total INTEGER;
    v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT quota_used, quota_total, quota_reset_at
    INTO v_used, v_total, v_reset_time
    FROM users
    WHERE id = user_uuid
    FOR UPDATE;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    IF v_reset_time <= NOW() THEN
        UPDATE users
        SET quota_used = 0, quota_reset_at = NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day'
        WHERE id = user_uuid;
        v_used := 0;
    END IF;

    IF v_used >= v_total THEN RETURN FALSE; END IF;

    UPDATE users SET quota_used = quota_used + 1 WHERE id = user_uuid;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_user_quota(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET quota_used = 0, quota_reset_at = NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day'
    WHERE id = user_uuid AND quota_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW() AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- #18: When user is deactivated, cancel their active jobs and subscriptions
CREATE OR REPLACE FUNCTION on_user_deactivated()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        UPDATE download_jobs
        SET status = 'cancelled', error_message = 'User account deactivated'
        WHERE user_id = NEW.id AND status IN ('pending', 'processing');

        UPDATE user_subscriptions
        SET status = 'cancelled', cancelled_at = NOW() AT TIME ZONE 'UTC'
        WHERE user_id = NEW.id AND status = 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_deactivated
AFTER UPDATE OF is_active ON users
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
EXECUTE FUNCTION on_user_deactivated();

-- ===========================================
-- FK & COMMENTS
-- ===========================================
ALTER TABLE users
ADD CONSTRAINT fk_users_subscription_plan
FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id)
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_platform_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'User accounts with authentication, RBAC, and subscription info';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers with pricing and limits';
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription history and billing cycles';
COMMENT ON TABLE download_jobs IS 'Video download requests with status tracking and retry logic';
COMMENT ON TABLE payments IS 'Payment transactions from all payment providers';
COMMENT ON TABLE video_metadata IS 'Cached video metadata to reduce API calls';
COMMENT ON TABLE audit_logs IS 'System activity logs for admin and security';
COMMENT ON FUNCTION check_and_increment_quota IS 'Atomic quota check with FOR UPDATE locking';
COMMENT ON TRIGGER trg_user_deactivated ON users IS 'Cascades deactivation: cancels jobs and subscriptions';

DO $$
BEGIN
    RAISE NOTICE 'VideoVault database schema v2.1 created successfully!';
END $$;
