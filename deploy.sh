#!/bin/bash

# Simple deployment script that always rebuilds and restarts
# Usage: ./deploy.sh

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Always build the application
echo "📦 Building application..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed!"
    exit 1
fi

# Always restart the application
echo "🔄 Restarting application..."
pm2 restart hundred-acre-realm

if [ $? -eq 0 ]; then
    echo "✅ Application restarted successfully"
else
    echo "❌ Failed to restart application!"
    exit 1
fi

echo "🎉 Deployment complete!" 