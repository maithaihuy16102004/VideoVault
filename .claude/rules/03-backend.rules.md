# Backend Architecture (.NET 8)

## 3.1 Tech Stack
- **Language**: C# 12
- **Framework**: ASP.NET Core 8 Web API
- **Architecture**: Clean Architecture + Modular Monolith
- **ORM**: Entity Framework Core 8 with PostgreSQL 16
- **Realtime**: SignalR
- **Authentication**: JWT + OAuth2 + Identity
- **Queue**: Hangfire / RabbitMQ
- **Cache**: Redis
- **Storage**: MinIO / AWS S3
- **Validation**: FluentValidation
- **Mapping**: Mapster
- **Logging**: Serilog
- **Monitoring**: Prometheus + Grafana
- **API Docs**: Swagger / Scalar
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions

## 3.2 Folder Structure
```
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
```

## 3.3 Recommended NuGet Packages
- **Core**: `Microsoft.EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`
- **Auth**: `Microsoft.AspNetCore.Authentication.JwtBearer`, `AspNetCore.Identity`
- **Validation**: `FluentValidation.AspNetCore`
- **Mapping**: `Mapster`, `MapsterMapper`
- **Logging**: `Serilog.AspNetCore`, `Serilog.Sinks.Console`
- **Redis**: `StackExchange.Redis`
- **Background Jobs**: `Hangfire.AspNetCore`, `Hangfire.Redis.StackExchange`
- **Swagger**: `Swashbuckle.AspNetCore`
- **Realtime**: `Microsoft.AspNetCore.SignalR`
- **Rate Limiting**: `AspNetCoreRateLimit`

## 3.4 Entity Framework Configuration
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    );
});
```

## 3.5 Authentication Flow
React Client → ASP.NET API → JWT Access Token (15m) → Refresh Token (7d) → Redis Session Cache

## 3.6 SignalR Realtime Download Progress
```csharp
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
```

## 3.7 Video Download Requirements
- **Original Format**: Always download videos in their original format, maintaining the maximum possible quality.
- **No Watermark**: Always prioritize downloading the no-watermark version of the video across all platforms (Douyin, TikTok, etc.).
- **Progress Tracking**: Ensure real-time progress parsing accurately maps terminal output from the download scripts to the database and frontend.