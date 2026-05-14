# Deployment Rules (Production)

## 7.1 Environment Strategy
- **Development**: Docker Compose with all services
- **Staging**: Single VM with Docker Compose, limited workers
- **Production**: Kubernetes (future) or single-server Docker Compose with systemd

## 7.2 Environment Variables
- Separate `.env.production` with encrypted secrets
- Use HashiCorp Vault or AWS Secrets Manager for production secrets
- Example:
  ```env
  APP_ENV=production
  DATABASE_URL=postgresql://postgres:postgres@db:5432/videovault
  REDIS_URL=redis://redis:6379/0
  MINIO_ENDPOINT=minio:9000
  MINIO_ACCESS_KEY=...
  MINIO_SECRET_KEY=...
  JWT_ACCESS_SECRET=...
  ```

## 7.3 Scaling Rules
- **Horizontal Scaling**: Add API replicas behind Nginx upstream
- **Worker Scaling**: Add additional worker containers with queue-specific concurrency
- **Cache Scaling**: Redis Cluster when > 5GB memory usage
- **Storage Scaling**: Add MinIO distributed mode when > 100GB storage

## 7.4 Monitoring & Alerts
- **Health Checks**: `/health` endpoint returning 200 when all dependencies OK
- **Logging**: Centralized logging with Loki + Grafana
- **Metrics**: Prometheus scrapes `/metrics` endpoint
- **Alerts**: Grafana alerts for:
  - CPU > 80% for 5m
  - Memory > 85%
  - Queue length > 1000
  - Error rate > 1%

## 7.5 Rollback Procedure
1. Pull previous image tags (`:v1`, `:v2`)
2. `docker-compose up -d --force-recreate`
3. Verify health endpoint returns 200
4. If failed, restore previous container state from backup

## 7.6 Secrets Management
- Use Docker secrets for sensitive data
- Example:
  ```yaml
  secrets:
    - jwt_access_secret
    - db_password