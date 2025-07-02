#!/bin/bash

# Hundred Acre Realm Docker Deployment Script

set -e

echo "🚀 Deploying Hundred Acre Realm from Docker Hub..."

# Create necessary folders for data persistence
echo "📁 Creating data folders..."
mkdir -p public coregamedata data parsed_sessions uploads

# Pull the latest image from Docker Hub
echo "📥 Pulling latest image from Docker Hub..."
docker-compose pull

echo "✅ Image pulled successfully!"

echo "📋 Starting the application..."
echo "   - The app will be available at http://localhost:3000"
echo "   - Dynamic folders are mapped for persistence:"
echo "     - ./public -> /app/public (auto-initialized with images/assets)"
echo "     - ./coregamedata -> /app/coregamedata (auto-initialized with game data)"
echo "     - ./data -> /app/data (auto-initialized with app config)"
echo "     - ./parsed_sessions -> /app/parsed_sessions (user session data)"
echo "     - ./uploads -> /app/uploads (user uploaded files)"
echo "   - Core game data will be auto-initialized on first run"

# Start the container
docker-compose up -d

echo "🎉 Deployment completed!"
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop app: docker-compose down"
echo "   - Restart app: docker-compose restart"
echo "   - Update app: docker-compose pull && docker-compose up -d"
echo ""
echo "🌐 Multi-platform support:"
echo "   - Linux (amd64 & arm64)"
echo "   - Windows (via WSL2/Docker Desktop)"
echo "   - macOS (Intel & Apple Silicon)" 