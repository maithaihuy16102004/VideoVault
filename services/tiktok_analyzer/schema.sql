-- Database Schema for VideoVault AI Promote Engine (Decision Intelligence System)

-- 1. video_metrics_snapshots: Time-series table to track metrics over time (Velocity, Growth)
CREATE TABLE IF NOT EXISTS video_metrics_snapshots (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL,
    snapshot_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    views BIGINT NOT NULL,
    likes BIGINT NOT NULL,
    comments BIGINT NOT NULL,
    shares BIGINT NOT NULL,
    saves BIGINT NOT NULL,
    weighted_engagement_score FLOAT, -- Like*1 + Comment*4 + Share*8 + Save*10
    engagement_rate FLOAT,
    completion_rate FLOAT,
    velocity_1h FLOAT, -- Views/hour
    velocity_24h FLOAT,
    -- Retention details
    retention_at_3s FLOAT,
    retention_at_5s FLOAT,
    retention_curve JSONB, -- Array of points {second: X, retention: Y}
    rewatch_spikes JSONB, -- Array of seconds [10, 25]
    scene_correlation JSONB, -- {"face_close_up": 2.5, "fast_motion": -1.2}
    
    CONSTRAINT unique_video_snapshot UNIQUE (video_id, snapshot_timestamp)
);

CREATE INDEX idx_snapshot_video_id ON video_metrics_snapshots(video_id);
CREATE INDEX idx_snapshot_timestamp ON video_metrics_snapshots(snapshot_timestamp);

-- 2. video_predictions: Stores AI Engine's predictions and strategies
CREATE TABLE IF NOT EXISTS video_predictions (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL,
    prediction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Phase 1 & 2 Scores
    viral_score INT,
    hook_score INT,
    retention_score INT,
    conversion_score INT,
    overall_score INT,
    
    -- Decisions & Diagnosis
    is_hero BOOLEAN DEFAULT FALSE,
    final_verdict TEXT,
    failure_primary_reason TEXT,
    failure_secondary_reason TEXT,
    failure_severity VARCHAR(50),
    
    -- Phase 4: Promote ROI
    should_promote BOOLEAN DEFAULT FALSE,
    suggested_budget_usd FLOAT,
    expected_cpm FLOAT,
    expected_cpa FLOAT,
    organic_spillover_multiplier FLOAT,
    
    -- Phase 6: Automation
    auto_promote_trigger BOOLEAN DEFAULT FALSE,
    auto_kill_trigger BOOLEAN DEFAULT FALSE,
    automation_status VARCHAR(50) DEFAULT 'IDLE',
    recommended_actions JSONB, -- Array of objects
    
    CONSTRAINT unique_video_prediction UNIQUE (video_id, prediction_timestamp)
);

CREATE INDEX idx_prediction_video_id ON video_predictions(video_id);
CREATE INDEX idx_prediction_timestamp ON video_predictions(prediction_timestamp);
CREATE INDEX idx_prediction_hero ON video_predictions(is_hero);

-- 3. video_embeddings: Vector storage for semantic search and clustering
CREATE TABLE IF NOT EXISTS video_embeddings (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(255) NOT NULL UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    title TEXT,
    description TEXT,
    hashtags JSONB,
    niche VARCHAR(255),
    
    -- For pgvector (Assuming pgvector extension is installed: CREATE EXTENSION vector;)
    -- Vector sizes depend on the embedding model (e.g., 384 for sentence-transformers, 768 for OpenAI, 1536)
    content_embedding vector(384),
    visual_embedding vector(384),
    audio_embedding vector(384)
);

CREATE INDEX idx_video_embeddings_video_id ON video_embeddings(video_id);
-- HNSW index for fast similarity search
-- CREATE INDEX idx_video_embeddings_content ON video_embeddings USING hnsw (content_embedding vector_cosine_ops);
