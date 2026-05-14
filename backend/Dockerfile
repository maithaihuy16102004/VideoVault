FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY VideoVault.sln .
COPY src/VideoVault.API/VideoVault.API.csproj src/VideoVault.API/
COPY src/VideoVault.Application/VideoVault.Application.csproj src/VideoVault.Application/
COPY src/VideoVault.Domain/VideoVault.Domain.csproj src/VideoVault.Domain/
COPY src/VideoVault.Infrastructure/VideoVault.Infrastructure.csproj src/VideoVault.Infrastructure/
COPY src/VideoVault.Contracts/VideoVault.Contracts.csproj src/VideoVault.Contracts/

# Restore dependencies
RUN dotnet restore

# Copy everything and build
COPY . .
RUN dotnet publish src/VideoVault.API/VideoVault.API.csproj -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "VideoVault.API.dll"]
