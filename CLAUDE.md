# CLAUDE.md — VideoVault SaaS Platform

> Hệ thống web tải video chất lượng gốc từ Douyin, TikTok, Xiaohongshu, Bilibili, YouTube...  
> Kiến trúc SaaS với phân quyền người dùng, gói dịch vụ, và bảng quản trị admin.

--- 

## 1. TỔNG QUAN HỆ THỐNG

VideoVault/
├── Backend (ASP.NET Core 8 Web API)
│   ├── VideoVault.API                 # Entry point
│   ├── VideoVault.Application         # Business logic (Clean Architecture)
│   ├── VideoVault.Domain              # Entities + interfaces
│   ├── VideoVault.Infrastructure      # EF Core + Redis + Storage
│   ├── VideoVault.Contracts           # DTOs + responses
│   └── VideoVault.Shared              # Shared helpers
│
├── Frontend (React 18 + Vite + TanStack)
│   ├── src/
│   │   ├── app/
│   │   ├── routes/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── downloads/
│   │   │   ├── billing/
│   │   │   ├── admin/
│   │   │   └── analytics/
│   │   ├── shared/
│   │   │   ├── api/
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── store/
│   │   └── main.tsx
│   ├── public/
│   └── vite.config.ts
│
├── Worker (TypeScript/Node.js or .NET Background Service)
│   ├── DownloadWorker                 # Hangfire task runner
│   ├── SeleniumPool                 # Browser pool manager
│   └── QualityAnalyzer              # Video quality analysis
│
└── Infrastructure
    ├── PostgreSQL 16                  # Primary database
    ├── Redis 7                        # Queue + Cache + Sessions
    ├── MinIO / S3                     # Video storage (temp)
    └── Nginx                          # Reverse proxy + rate limit
```

--- 

## 2. DATABASE ARCHITECTURE (PostgreSQL)

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

--- 

## 3. BACKEND ARCHITECTURE (.NET 8)

### 3.1 Tech Stack (Updated)
- Language:           C# 12
- Framework:          ASP.NET Core 8 Web API
- Architecture:       Clean Architecture + Modular Monolith
- ORM:                Entity Framework Core 8
- Database:           PostgreSQL 16
- Realtime:           SignalR
- Authentication:     JWT + OAuth2 + Identity
- Queue:              Hangfire / RabbitMQ
- Cache:              Redis
- Storage:            MinIO / AWS S3
- Validation:         FluentValidation
- Mapping:            Mapster
- Logging:            Serilog
- Monitoring:         Prometheus + Grafana
- API Docs:           Swagger / Scalar
- Containerization:   Docker + Docker Compose
- Reverse Proxy:      Nginx
- CI/CD:              GitHub Actions

### 3.2 Backend Folder Structure
backend/
├── src/
│   ├── VideoVault.API/                 # Entry point
│   ├── VideoVault.Application/         # Business logic
│   ├── VideoVault.Domain/              # Entities + interfaces
│   ├── VideoVault.Infrastructure/      # EF Core + Redis + Storage
│   ├── VideoVault.Contracts/           # DTOs + responses
│   └── VideoVault.Shared/              # Shared helpers
│
├── tests/
│   ├── VideoVault.UnitTests/
│   └── VideoVault.IntegrationTests/
│
├── docker/
├── scripts/
└── docker-compose.yml

### 3.3 Recommended NuGet Packages
# Core
Microsoft.EntityFrameworkCore
Npgsql.EntityFrameworkCore.PostgreSQL

# Auth
Microsoft.AspNetCore.Authentication.JwtBearer
AspNetCore.Identity

# Validation
FluentValidation.AspNetCore

# Mapping
Mapster
MapsterMapper

# Logging
Serilog.AspNetCore
Serilog.Sinks.Console

# Redis
StackExchange.Redis

# Background Jobs
Hangfire.AspNetCore
Hangfire.Redis.StackExchange

# Swagger
Swashbuckle.AspNetCore

# Realtime
Microsoft.AspNetCore.SignalR

# Rate limiting
AspNetCoreRateLimit

### 3.4 Entity Framework Configuration
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
});

### 3.5 Authentication Flow
React Client
    ↓
ASP.NET API
    ↓
JWT Access Token (15m)
Refresh Token (7d)
    ↓
Redis Session Cache

### 3.6 SignalR Realtime Download Progress
public class DownloadHub : Hub
{
    public async Task JoinJob(string jobId)
    {
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"job-{jobId}"
        );
    }
}

--- 

## 4. FRONTEND ARCHITECTURE (ReactJS)

### 4.1 Frontend Stack (Updated)
- Framework:          React 18 + Vite
- Routing:            TanStack Router
- State Management:   Zustand
- Server State:       TanStack Query
- Forms:              React Hook Form + Zod
- UI Library:         shadcn/ui
- Styling:            TailwindCSS
- Tables:             TanStack Table
- Charts:             Recharts
- Realtime:           SignalR Client
- HTTP Client:        Axios
- Auth Storage:       HttpOnly Cookies
- Animation:          Framer Motion
- Build Tool:         Vite

### 4.2 Frontend Structure
frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── features/
│   │   ├── auth/
│   │   ├── downloads/
│   │   ├── billing/
│   │   ├── admin/
│   │   └── analytics/
│   │
│   ├── shared/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── store/
│   └── main.tsx
│
├── public/
└── vite.config.ts

### 4.3 API Layer Pattern
// shared/api/download.api.ts

export const createDownloadJob = async (
  payload: CreateJobRequest
) => {
  const response = await api.post(
    "/downloads",
    payload
  );

  return response.data;
};

### 4.4 TanStack Query Example
export const useDownloadHistory = () => {
  return useQuery({
    queryKey: ["downloads"],
    queryFn: getDownloadHistory,
  });
};

--- 

## 5. DATABASE ARCHITECTURE (PostgreSQL) (Repeated for emphasis)

### 5.1 PostgreSQL Best Practices
(Repeated content from section 2)

### 5.2 Enable UUID Extension
(Repeated)

### 5.3 Recommended Indexes
(Repeated)

### 5.4 DBeaver Workflow
(Repeated)

--- 

## 6. DOCKER ARCHITECTURE

### 6.1 Docker Stack
Docker Compose
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

volumes:
  postgres_data:

### 6.2 Dockerfile Examples
### 6.2.1 Backend Dockerfile (.NET)
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

### 6.2.2 Frontend Dockerfile (React)
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]

### 6.3 Deployment Flow
### 6.3.1 Development Workflow
VSCode
   ↓
Docker Compose
   ↓
ASP.NET API + React + PostgreSQL
   ↓
DBeaver quản lý database
   ↓
Push GitHub

### 6.3.2 Production Deployment
GitHub Actions
      ↓
Docker Build
      ↓
Push Docker Image
      ↓
VPS / Ubuntu Server
      ↓
Docker Compose Pull
      ↓
Nginx Reverse Proxy
      ↓
Cloudflare CDN

### 6.4 CI/CD PIPELINE
GitHub Actions
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

### 6.5 RECOMMENDED VPS SPECS
MVP
CPU:        4 vCPU
RAM:        8GB
Storage:    120GB SSD
Bandwidth:  2TB
OS:         Ubuntu 24.04
11. RECOMMENDED DEVELOPMENT TOOLS
Tool	Purpose
Visual Studio Code	Frontend + Docker
Visual Studio	ASP.NET Backend
DBeaver	PostgreSQL GUI
Postman	API Testing
Docker Desktop	Local containers

--- 

## 7. FINAL ARCHITECTURE (UPDATED)

                ┌─────────────────────┐
                │     React Client    │
                │  React + TanStack   │
                └──────────┬──────────┘
                           │
                     HTTPS │
                           ▼
                ┌─────────────────────┐
                │       Nginx         │
                │ Reverse Proxy       │
                └──────────┬──────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
 ┌──────────────────┐              ┌──────────────────┐
 │ ASP.NET Core API │              │ SignalR Hub      │
 │ .NET 8 Web API   │              │ Realtime Events  │
 └─────────┬────────┘              └─────────┬────────┘
           │                                 │
           ├──────────────┬──────────────────┤
           ▼              ▼                  ▼
   ┌────────────┐  ┌────────────┐    ┌────────────┐
   │ PostgreSQL │  │ Redis      │    │ MinIO      │
   │ Main DB    │  │ Cache      │    │ Video Files│
   └────────────┘  └────────────┘    └────────────┘
           │
           ▼
   ┌─────────────────┐
   │ Worker Service  │
   │ yt-dlp/Selenium │
   └─────────────────┘
```

--- 

*Generated by Claude — VideoVault SaaS Architecture v1.0*
