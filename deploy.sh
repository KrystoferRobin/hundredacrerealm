#!/bin/bash

# Smart deployment script that only builds when necessary
# Usage: ./deploy.sh

echo "🚀 Starting smart deployment..."

# Store the current commit hash before pulling
PREVIOUS_COMMIT=$(git rev-parse HEAD)

# Pull latest changes, handling dynamic content conflicts gracefully
echo "📥 Pulling latest changes..."
git stash push -m "Dynamic content backup" --include-untracked || true
git pull origin main
git stash pop || true

# Get the new commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)

# Check if there were any changes
if [ "$PREVIOUS_COMMIT" = "$CURRENT_COMMIT" ]; then
    echo "✅ No changes detected, skipping deployment"
    exit 0
fi

# Get list of changed files between the two commits
CHANGED_FILES=$(git diff --name-only $PREVIOUS_COMMIT $CURRENT_COMMIT)

echo "📋 Changed files:"
echo "$CHANGED_FILES"

# Initialize build flag
NEEDS_BUILD=false

# Check for files that require a build
echo "🔍 Analyzing changes..."

# Check for client-side component changes
if echo "$CHANGED_FILES" | grep -E "\.(tsx|jsx|ts|js)$" | grep -v "api/" > /dev/null; then
    echo "   📦 Client-side components changed"
    NEEDS_BUILD=true
fi

# Check for configuration changes
if echo "$CHANGED_FILES" | grep -E "(package\.json|next\.config|tailwind\.config|tsconfig)" > /dev/null; then
    echo "   ⚙️  Configuration files changed"
    NEEDS_BUILD=true
fi

# Check for styling changes
if echo "$CHANGED_FILES" | grep -E "\.(css|scss)$" > /dev/null; then
    echo "   🎨 Styling files changed"
    NEEDS_BUILD=true
fi

# Check for layout changes
if echo "$CHANGED_FILES" | grep -E "(layout\.tsx|globals\.css)" > /dev/null; then
    echo "   🏗️  Layout files changed"
    NEEDS_BUILD=true
fi

# Check for environment changes
if echo "$CHANGED_FILES" | grep -E "\.env" > /dev/null; then
    echo "   🔧 Environment files changed"
    NEEDS_BUILD=true
fi

# Determine if build is needed
if [ "$NEEDS_BUILD" = true ]; then
    echo "📦 Building application (client-side changes detected)..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build completed successfully"
    else
        echo "❌ Build failed!"
        exit 1
    fi
else
    echo "⚡ Skipping build (only server-side changes detected)"
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
echo "   - Build required:  $NEEDS_BUILD" 