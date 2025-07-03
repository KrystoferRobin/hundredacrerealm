#!/bin/bash

# Hundred Acre Realm Development Setup Script

set -e

echo "🎮 Hundred Acre Realm Development Setup"
echo "======================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to start local development
start_local() {
    echo "🚀 Starting local development server..."
    
    if ! command_exists node; then
        echo "❌ Node.js not found. Please install Node.js first."
        echo "   Run: brew install node"
        exit 1
    fi
    
    if ! command_exists npm; then
        echo "❌ npm not found. Please install npm first."
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    if port_in_use 3000; then
        echo "⚠️  Port 3000 is already in use. Stopping existing process..."
        pkill -f "next dev" || true
        sleep 2
    fi
    
    echo "🌐 Starting development server at http://localhost:3000"
    echo "   Press Ctrl+C to stop the server"
    echo ""
    npm run dev
}

# Function to start Docker development
start_docker() {
    echo "🐳 Starting Docker development environment..."
    
    if ! command_exists docker; then
        echo "❌ Docker not found. Please install Docker Desktop first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        echo "❌ Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    
    # Create necessary folders
    mkdir -p public coregamedata data parsed_sessions uploads
    
    if port_in_use 3000; then
        echo "⚠️  Port 3000 is already in use. Stopping existing containers..."
        docker-compose down || true
        sleep 2
    fi
    
    echo "🌐 Starting Docker container at http://localhost:3000"
    echo "   Run 'docker-compose logs -f' to view logs"
    echo "   Run 'docker-compose down' to stop"
    echo ""
    docker-compose up -d
    
    echo "⏳ Waiting for container to start..."
    sleep 5
    
    # Check if container is healthy
    if curl -s http://localhost:3000/api/health >/dev/null; then
        echo "✅ Container is running and healthy!"
    else
        echo "⚠️  Container started but health check failed. Check logs with: docker-compose logs"
    fi
}

# Function to stop all services
stop_all() {
    echo "🛑 Stopping all services..."
    
    # Stop local development server
    pkill -f "next dev" || true
    
    # Stop Docker containers
    docker-compose down || true
    
    echo "✅ All services stopped."
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    echo ""
    
    # Check local development
    if pgrep -f "next dev" >/dev/null; then
        echo "✅ Local development server: Running"
        if curl -s http://localhost:3000/api/health >/dev/null; then
            echo "   Health check: ✅ Healthy"
        else
            echo "   Health check: ❌ Failed"
        fi
    else
        echo "❌ Local development server: Not running"
    fi
    
    echo ""
    
    # Check Docker
    if docker-compose ps | grep -q "hundreacrerealm.*Up"; then
        echo "✅ Docker container: Running"
        if curl -s http://localhost:3000/api/health >/dev/null; then
            echo "   Health check: ✅ Healthy"
        else
            echo "   Health check: ❌ Failed"
        fi
    else
        echo "❌ Docker container: Not running"
    fi
    
    echo ""
    echo "🌐 Application URL: http://localhost:3000"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  local     Start local development server (Node.js)"
    echo "  docker    Start Docker development environment"
    echo "  stop      Stop all services"
    echo "  status    Show status of all services"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local    # Start local development"
    echo "  $0 docker   # Start Docker environment"
    echo "  $0 status   # Check service status"
}

# Main script logic
case "${1:-help}" in
    "local")
        start_local
        ;;
    "docker")
        start_docker
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac 