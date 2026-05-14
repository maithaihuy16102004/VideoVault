# Docker Architecture (Docker + Docker Compose)

## 6.1 Docker Stack
Docker Compose services:

```yaml
version: '3.9'
services:
  api:
    build:
      context: ./backend
    container_name: videovault-api
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
      - minio

  frontend:
    build:
      context: ./frontend
    container_name: videovault-frontend
    ports:
      - "3000:3000"

  postgres:
    image: postgres:16-alpine
    container_name: videovault-db
    environment:
      POSTGRES_DB: videovault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: videovault-redis

  minio:
    image: minio/minio
    container_name: videovault-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"

  nginx:
    image: nginx:alpine
    container_name: videovault-nginx
    ports:
      - "80:80"
```

## 6.2 Dockerfile Examples
### 6.2.1 Backend Dockerfile (.NET)
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "VideoVault.API.dll"]
```

### 6.2.2 Frontend Dockerfile (React)
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 6.3 Deployment Flow
### 6.3.1 Development Workflow
VSCode → Docker Compose → ASP.NET API + React + PostgreSQL → DBeaver quản lý database → Push GitHub

### 6.3.2 Production Deployment
GitHub Actions → Docker Build → Push Docker Image → VPS / Ubuntu Server → Docker Compose Pull → Nginx Reverse Proxy → Cloudflare CDN

### 6.4 CI/CD Pipeline
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
      - name: Build Backend
        run: docker build -t videovault-api ./backend
      - name: Build Frontend
        run: docker build -t videovault-frontend ./frontend