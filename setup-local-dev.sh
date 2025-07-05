#!/bin/bash

# Setup script for local development environment
# This mirrors the Docker setup but runs locally

REALM_DIR="/Users/krystoferrobin/Documents/realm"
PROJECT_DIR="/Users/krystoferrobin/Documents/hundredacrerealm"

echo "Setting up local development environment in $REALM_DIR..."

# Create necessary directories
mkdir -p "$REALM_DIR/public/parsed_sessions"
mkdir -p "$REALM_DIR/public/uploads"
mkdir -p "$REALM_DIR/public/stats"
mkdir -p "$REALM_DIR/coregamedata"
mkdir -p "$REALM_DIR/data"
mkdir -p "$REALM_DIR/scripts"

# Copy essential files for local development
echo "Copying essential files..."

# Copy the entire app directory (Next.js app)
cp -r "$PROJECT_DIR/app" "$REALM_DIR/"

# Copy Next.js configuration files
cp "$PROJECT_DIR/next.config.js" "$REALM_DIR/"
cp "$PROJECT_DIR/tsconfig.json" "$REALM_DIR/"
cp "$PROJECT_DIR/tailwind.config.js" "$REALM_DIR/"
cp "$PROJECT_DIR/postcss.config.js" "$REALM_DIR/"
cp "$PROJECT_DIR/next-env.d.ts" "$REALM_DIR/"

# Copy package files
cp "$PROJECT_DIR/package.json" "$REALM_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$REALM_DIR/"

# Copy public assets (but preserve existing parsed_sessions and uploads)
cp -r "$PROJECT_DIR/public/images" "$REALM_DIR/public/"
cp -r "$PROJECT_DIR/public/parchment.jpg" "$REALM_DIR/public/" 2>/dev/null || true

# Copy core game data
cp -r "$PROJECT_DIR/coregamedata" "$REALM_DIR/"

# Copy data files
cp -r "$PROJECT_DIR/data" "$REALM_DIR/"

# Copy scripts
cp -r "$PROJECT_DIR/scripts" "$REALM_DIR/"

# Copy characters
cp -r "$PROJECT_DIR/characters" "$REALM_DIR/"

# Copy components
cp -r "$PROJECT_DIR/components" "$REALM_DIR/"

# Create a local .env file for development
cat > "$REALM_DIR/.env.local" << EOF
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
EOF

echo "Local development environment setup complete!"
echo ""
echo "To start development:"
echo "cd $REALM_DIR"
echo "npm install"
echo "npm run dev"
echo ""
echo "The app will be available at http://localhost:3000" 