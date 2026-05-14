# CI/CD Rules (GitHub Actions)

## 6.1 Pipeline Triggers
- Runs on `push` to `main` branch
- Optional: `pull_request` for PR validation

## 6.2 Job Structure
```yaml
name: Deploy VideoVault
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build Backend
      - name: Build Backend
        run: docker build -t videovault-api ./backend

      # Build Frontend
      - name: Build Frontend
        run: docker build -t videovault-frontend ./frontend

      # Push Images
      - name: Push Docker Images
        run: |
          docker tag videovault-api registry.example.com/videovault-api:latest
          docker tag videovault-frontend registry.example.com/videovault-frontend:latest
          docker push registry.example.com/videovault-api:latest
          docker push registry.example.com/videovault-frontend:latest

      # Deploy to VPS
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/videovault
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

## 6.3 Secrets Management
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` for server access
- `REGISTRY_URL` for Docker registry
- `DB_PASSWORD`, `REDIS_PASSWORD` for container credentials

## 6.4 Rollback Strategy
- Keep last 2 image versions
- Use `docker-compose up -d` with specific version tags
- Health check endpoint `/health` for validation