# Overview Architecture

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