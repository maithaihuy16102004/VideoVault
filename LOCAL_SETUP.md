# VideoVault Local Development Setup

## 🔐 Secrets Management

Never commit API keys, passwords, or sensitive configuration to Git. Follow these steps to set up secrets locally.

### 1. Backend Configuration (.NET)

#### Option A: Using `appsettings.Development.json` (Recommended for local dev)

```bash
# 1. Copy the example file
cp backend/src/VideoVault.API/appsettings.Example.json backend/src/VideoVault.API/appsettings.Development.json

# 2. Edit with YOUR actual credentials
# NOTE: appsettings.Development.json is already in .gitignore
```

**appsettings.Development.json example:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=5432;Database=videovault;User Id=postgres;Password=YOUR_ACTUAL_PASSWORD;"
  },
  "JWT": {
    "Key": "your-super-secret-jwt-key-at-least-32-chars-minimum-length123",
    "Issuer": "VideoVault",
    "Audience": "VideoVaultClient"
  },
  "Gemini": {
    "ApiKey": "YOUR_ACTUAL_GEMINI_API_KEY"
  }
}
```

#### Option B: Using User Secrets (.NET User Secrets Manager)

```bash
# Initialize User Secrets (one-time setup)
cd backend/src/VideoVault.API
dotnet user-secrets init

# Set individual secrets
dotnet user-secrets set "JWT:Key" "your-super-secret-jwt-key-minimum-32-chars"
dotnet user-secrets set "Gemini:ApiKey" "your-actual-gemini-api-key"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "postgresql://..."

# View all secrets
dotnet user-secrets list
```

### 2. Docker Compose (Development)

Create `docker-compose.override.yml` for local overrides (git-ignored):

```yaml
# docker-compose.override.yml
version: '3.9'
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: your_actual_dev_password
  minio:
    environment:
      MINIO_ROOT_PASSWORD: your_actual_minio_password
```

### 3. Environment Variables

Copy and customize `.env`:

```bash
cp .env.example .env
# Edit .env with YOUR actual values
# NOTE: .env is already in .gitignore
```

Load environment variables in Docker Compose:
```yaml
# In docker-compose.yml
api:
  environment:
    JWT_KEY: ${JWT_KEY}
    GEMINI_API_KEY: ${GEMINI_API_KEY}
    DATABASE_URL: ${DATABASE_URL}
```

### 4. Production Deployment

#### For Azure/Cloud Deployments:
- Use **Azure Key Vault** or **AWS Secrets Manager**
- Set environment variables in deployment pipeline

#### For Self-Hosted (VPS):
```bash
# On production server, create .env in the application directory
ssh user@your-vps
cat > /opt/videovault/.env << EOF
JWT_KEY=production_secret_key_here
GEMINI_API_KEY=production_api_key
DATABASE_URL=postgresql://user:password@db-host:5432/videovault
ENVIRONMENT=Production
EOF

chmod 600 /opt/videovault/.env
```

#### For Docker Secrets (Swarm/K8s):
```bash
# Create Docker secret
echo "your_secret_value" | docker secret create jwt_key -

# Reference in docker-compose.yml
services:
  api:
    secrets:
      - jwt_key
    environment:
      JWT_KEY_FILE: /run/secrets/jwt_key
```

## 📋 Checklist Before Committing

- [ ] No `appsettings.Development.json` in git (it's in .gitignore)
- [ ] No `.env` file in git (it's in .gitignore)
- [ ] No API keys visible in `Program.cs` or other source files
- [ ] JWT key is NOT hardcoded (must come from config)
- [ ] Database password is NOT hardcoded
- [ ] `docker-compose.override.yml` is NOT committed

## 🚀 Starting Development

```bash
# 1. Setup local config
cp .env.example .env
# Edit .env with your values

# 2. Copy backend config
cp backend/src/VideoVault.API/appsettings.Example.json backend/src/VideoVault.API/appsettings.Development.json
# Edit with your values

# 3. Start Docker containers
docker-compose up -d

# 4. Run migrations
cd backend
dotnet ef database update

# 5. Run backend
dotnet run --project src/VideoVault.API/VideoVault.API.csproj

# 6. Run frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## ⚠️ Security Reminders

1. **Never** commit `.env` files
2. **Never** commit `appsettings.Development.json`
3. **Never** hardcode credentials in source code
4. **Always** use environment variables for production
5. **Rotate** secrets regularly
6. **Use** different secrets for different environments
7. **Never** share secrets via email or chat (use secure vaults)

---

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md)
