# Database Architecture (PostgreSQL)

### 2.1 PostgreSQL Best Practices
Version: PostgreSQL 16
Extensions:
- pgcrypto
- uuid-ossp
- pg_trgm

Indexing:
- BTree indexes
- GIN fulltext indexes
- Partial indexes

Backups:
- pg_dump nightly
- WAL archiving

### 2.2 Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

### 2.3 Recommended Indexes
CREATE INDEX idx_download_jobs_platform
ON download_jobs(platform);

CREATE INDEX idx_download_jobs_user_status
ON download_jobs(user_id, status);

CREATE INDEX idx_payments_created_at
ON payments(created_at DESC);

### 2.4 DBeaver Workflow
1. Run docker-compose up
2. Open DBeaver
3. Create PostgreSQL connection
   - Host: localhost
   - Port: 5432
   - Database: videovault
   - Username: postgres
   - Password: postgres
4. Import SQL schema
5. Manage tables visually