#!/bin/bash

# Smart deployment script that rebuilds and restarts the application
# Usage: ./deploy.sh

echo "🚀 Starting deployment..."

# Store the current commit hash before pulling
PREVIOUS_COMMIT=$(git rev-parse HEAD)

# Pull latest changes, handling dynamic content conflicts gracefully
echo "📥 Pulling latest changes..."

# Check if there are any untracked files to stash
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo "   📦 Stashing untracked files (dynamic content)..."
    git stash push -m "Dynamic content backup" --include-untracked
    STASH_CREATED=true
else
    echo "   ✅ No untracked files to stash"
    STASH_CREATED=false
fi

# Pull the latest changes
git pull origin main

# Restore stashed content if we created a stash
if [ "$STASH_CREATED" = true ]; then
    echo "   📦 Restoring stashed content..."
    if ! git stash pop; then
        echo "   ⚠️  Warning: Could not automatically restore stashed content"
        echo "   📋 Stash is preserved. You may need to manually restore with: git stash pop"
        echo "   🔍 Check stash list with: git stash list"
    else
        echo "   ✅ Stashed content restored successfully"
    fi
fi

# Get the new commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)

# Always build and restart the application
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
echo "   - Previous commit: ${PREVIOUS_COMMIT:0:8}"
echo "   - Current commit:  ${CURRENT_COMMIT:0:8}"
echo "   - Application rebuilt and restarted" 