# Docker Deployment Guide

This guide explains how to deploy Hundred Acre Realm using Docker for production use.

## 🎯 **Multi-Platform Support**

This Docker image supports multiple platforms automatically:
- **Linux (amd64 & arm64)** - Traditional servers and ARM-based systems
- **Windows** - Via WSL2 or Docker Desktop (runs Linux containers)
- **macOS** - Intel and Apple Silicon Macs (runs Linux containers)

### **How Cross-Platform Support Works**

Docker containers are built for specific operating systems and architectures. Our image supports:
- **linux/amd64** - x86_64 Linux systems
- **linux/arm64** - ARM64 Linux systems (Apple Silicon, Raspberry Pi, etc.)

**Windows and macOS users** get the appropriate Linux version automatically:
- **Windows** → Gets `linux/amd64` via Docker Desktop/WSL2
- **macOS Intel** → Gets `linux/amd64` via Docker Desktop  
- **macOS Apple Silicon** → Gets `linux/arm64` via Docker Desktop

This is the standard way Docker works - Windows and macOS run Linux containers, which is why you only see Linux platforms in the image manifest.

Docker automatically detects your platform and pulls the correct version!

## Prerequisites

- Docker and Docker Compose installed on your system
- Git to clone the repository (optional for simple deployment)
- At least 2GB of available RAM
- 10GB of available disk space

## 🚀 **Quick Start (Simplified)**

### Option 1: Direct Docker Run (Easiest)
```bash
# Pull and run in one command
docker run -d \
  --name hundreacrerealm \
  -p 3000:3000 \
  -v $(pwd)/public:/app/public \
  -v $(pwd)/coregamedata:/app/coregamedata \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/parsed_sessions:/app/parsed_sessions \
  -v $(pwd)/uploads:/app/uploads \
  krystoferrobin/hundreacrerealm:latest
```

### Option 2: Using Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/KrystoferRobin/hundreacrerealm.git
cd hundreacrerealm

# Create folders for data persistence
mkdir -p public coregamedata data parsed_sessions uploads

# Start the application
docker-compose up -d
```

### Option 3: Using the Deployment Script
```bash
# Clone and run
git clone https://github.com/KrystoferRobin/hundreacrerealm.git
cd hundreacrerealm
./deploy.sh
```

## Manual Deployment

If you prefer to deploy manually:

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# Check status
docker-compose ps
```

## Automatic Initialization

On first run, the container will automatically:
- Copy core game data (characters, items, spells, etc.) to the mapped volumes
- Copy static assets and images
- Copy application configuration data
- Start the application

This means new users can get started immediately without needing to manually copy game data files!

## Folder Structure

The following folders are mapped outside the container for persistence:

```
hundreacrerealm/
├── public/              # Static assets, images (auto-initialized)
├── coregamedata/        # Game data (characters, items, spells, etc.) (auto-initialized)
├── data/               # Application configuration (auto-initialized)
├── parsed_sessions/     # Parsed game session data (user data)
├── uploads/            # User uploaded files
└── docker-compose.yml  # Docker configuration
```

**Note:** `public/`, `coregamedata/`, and `data/` are included in the container and automatically copied to the mapped volumes on first run. Users can modify these files after initialization.

## Configuration

### Port Configuration

The application runs on port 3000 by default. To change the port, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change 8080 to your desired port
```

### Environment Variables

You can add environment variables in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_TELEMETRY_DISABLED=1
  - CUSTOM_VAR=value
```

## Management Commands

### View Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs hundreacrerealm
```

### Container Management
```bash
# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Update and restart
docker-compose pull && docker-compose up -d

# Remove containers and images
docker-compose down --rmi all
```

### Health Check

The application includes a health check endpoint at `/api/health`. Docker will automatically monitor this:

```bash
# Test health check manually
curl http://localhost:3000/api/health
```

## Data Persistence

All dynamic data is stored outside the container in mapped volumes:

- **Public Assets**: `./public` - Static assets and images (auto-initialized)
- **Core Game Data**: `./coregamedata` - Character data, items, spells, monsters, etc. (auto-initialized)
- **Application Data**: `./data` - Application configuration and session titles (auto-initialized)
- **Session Data**: `./parsed_sessions` - Contains all parsed game sessions
- **Uploads**: `./uploads` - User uploaded files

### Core Game Data

Core game data is included in the container and automatically copied to the mapped volumes on first run:
- Character data, items, spells, monsters, natives, tiles, etc.
- Static images and assets
- Application configuration

Users can modify these files after initialization to customize their installation.

### Backup Strategy

To backup your data:

```bash
# Create a backup of all dynamic data
tar -czf backup-$(date +%Y%m%d).tar.gz \
  public/ coregamedata/ data/ parsed_sessions/ uploads/

# Restore from backup
tar -xzf backup-20241201.tar.gz
```

## Troubleshooting

### Container Won't Start

1. Check logs:
   ```bash
   docker-compose logs
   ```

2. Verify port availability:
   ```bash
   netstat -tulpn | grep :3000
   ```

3. Check disk space:
   ```bash
   df -h
   ```

### Application Errors

1. Check application logs:
   ```bash
   docker-compose logs hundreacrerealm
   ```

2. Verify file permissions:
   ```bash
   ls -la public/ parsed_sessions/
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

### Performance Issues

1. Monitor resource usage:
   ```bash
   docker stats
   ```

2. Check memory usage:
   ```bash
   free -h
   ```

3. Monitor disk I/O:
   ```bash
   iostat -x 1
   ```

## Security Considerations

1. **Firewall**: Configure your firewall to only allow necessary ports
2. **Reverse Proxy**: Consider using nginx or Apache as a reverse proxy
3. **SSL/TLS**: Use Let's Encrypt or similar for HTTPS
4. **Updates**: Regularly update the Docker image and dependencies

## Production Recommendations

1. **Use a reverse proxy** (nginx/Apache) for SSL termination
2. **Set up monitoring** (Prometheus, Grafana)
3. **Configure log rotation**
4. **Set up automated backups**
5. **Use Docker secrets** for sensitive data
6. **Configure resource limits** in docker-compose.yml

## Example nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Platform-Specific Notes

### Windows
- **Docker Desktop for Windows** runs Linux containers via WSL2
- **Windows Server with Docker** also runs Linux containers
- Use Windows-style paths in docker-compose.yml if needed
- Ensure WSL2 is enabled for Docker Desktop

### macOS
- **Docker Desktop for macOS** runs Linux containers
- **Apple Silicon Macs** automatically get ARM64 version (`linux/arm64`)
- **Intel Macs** automatically get AMD64 version (`linux/amd64`)

### Linux
- **Docker Engine** runs native Linux containers
- **ARM64 systems** (Raspberry Pi, AWS Graviton) get ARM64 version
- **x86_64 systems** get AMD64 version

## Technical Details

### Why Linux Containers on Windows/macOS?

Docker containers are built for specific operating systems. The most common and efficient approach is:
1. **Build containers for Linux** (smaller, faster, more compatible)
2. **Run them on Windows/macOS** via Docker Desktop
3. **Docker Desktop** provides the Linux runtime environment

This is why you see `linux/amd64` and `linux/arm64` in the image manifest - these are the actual platforms that get executed, regardless of the host operating system.

## Support

For issues or questions:
1. Check the logs first
2. Review this documentation
3. Check the main README.md
4. Open an issue on GitHub 