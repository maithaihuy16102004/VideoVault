# VPS Specifications (Production)

## 8.1 Recommended VPS Specs by Tier

### 8.1.1 MVP (Minimum Viable Product)
- **CPU**: 4 vCore
- **RAM**: 8 GB
- **Storage**: 120 GB SSD (NVMe)
- **Bandwidth**: 2 TB/month
- **OS**: Ubuntu 24.04 LTS
- **Monthly Cost**: $40-$60

### 8.1.2 Growth Tier
- **CPU**: 8 vCore
- **RAM**: 16 GB
- **Storage**: 250 GB SSD
- **Bandwidth**: 5 TB/month
- **OS**: Ubuntu 24.04 LTS
- **Monthly Cost**: $120-$180

### 8.1.3 Enterprise Tier
- **CPU**: 16 vCore
- **RAM**: 32 GB
- **Storage**: 500 GB SSD + 100 GB NVMe (fast storage)
- **Bandwidth**: 10 TB/month
- **OS**: Ubuntu 24.04 LTS
- **Monthly Cost**: $300-$500

## 8.2 Service Provider Recommendations
- **DigitalOcean**: Simple VPS, good for MVP
- **Linode**: Competitive pricing, good support
- **AWS EC2**: Enterprise scaling, higher cost
- **Hetzner Cloud**: High performance, German-based, good for EU compliance

## 8.3 Network Configuration
- **Firewall**: UFW with default deny incoming, allow SSH (22), HTTP (80), HTTPS (443)
- **DDoS Protection**: Enable provider-level DDoS protection
- **VPN Access**: WireGuard for admin access
- **CDN**: Cloudflare Free for DNS + basic CDN

## 8.4 Security Baseline
- **SSH**: Key-based authentication only, non-standard port
- **Fail2Ban**: Protect against brute force attacks
- **Automatic Updates**: Unattended-upgrades enabled
- **Log Monitoring**: Logrotate + centralized logging
- **Backup**: Daily encrypted backups to separate region