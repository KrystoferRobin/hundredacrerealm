#!/bin/bash

# Build and push script for Hundred Acre Realm Docker image (Multi-architecture)
set -e

# Get current date for versioning
DATE=$(date +%Y-%m-%d)
VERSION="v9"

# Image name and tag
IMAGE_NAME="krystoferrobin/hundreacrerealm"
TAG="${DATE}-${VERSION}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

# Set up buildx builder for multi-architecture builds
echo "🔧 Setting up Docker Buildx for multi-architecture builds..."

# Create and use a new builder instance if it doesn't exist
if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
    echo "📦 Creating new buildx builder instance..."
    docker buildx create --name multiarch-builder --use
else
    echo "🔄 Using existing buildx builder..."
    docker buildx use multiarch-builder
fi

# Start the builder
docker buildx inspect --bootstrap

echo "🐳 Building multi-architecture Docker image: ${FULL_IMAGE_NAME}"
echo "🏗️  Building for: linux/amd64, linux/arm64"

# Build and push the multi-architecture image
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag ${FULL_IMAGE_NAME} \
    --tag ${IMAGE_NAME}:latest \
    --push \
    .

echo "✅ Multi-architecture build and push completed successfully!"

echo "📋 Image details:"
echo "   - Versioned: ${FULL_IMAGE_NAME}"
echo "   - Latest: ${IMAGE_NAME}:latest"
echo "   - Architectures: linux/amd64, linux/arm64"

# Update docker-compose.yml with new image tag
echo "🔄 Updating docker-compose.yml with new image tag..."
sed -i.bak "s|image: ${IMAGE_NAME}:.*|image: ${FULL_IMAGE_NAME}|" docker-compose.yml

echo "✅ docker-compose.yml updated!"
echo "📝 You can now run: docker-compose up -d"
echo "🎉 Multi-architecture Docker image successfully built and pushed to Docker Hub!" 