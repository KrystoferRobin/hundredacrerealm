# Quick Start Guide

## 🚀 Local Development Setup

Your development environment is now ready! You have two options for running the application:

### Option 1: Local Development (Recommended for Development)

**Current Status**: ✅ **RUNNING** at http://localhost:3000

**To start/stop:**
```bash
# Start local development server
./dev-setup.sh local

# Stop all services
./dev-setup.sh stop

# Check status
./dev-setup.sh status
```

**Features:**
- Hot reloading (changes appear immediately)
- Full debugging capabilities
- Direct access to file system
- Faster development cycle

### Option 2: Docker Development

**To start Docker environment:**
```bash
# Start Docker container
./dev-setup.sh docker

# View logs
docker-compose logs -f

# Stop Docker container
docker-compose down
```

**Features:**
- Consistent environment across machines
- Production-like setup
- Isolated dependencies

## 🎮 Testing the Application

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```
Expected response: `{"status":"healthy","timestamp":"...","service":"hundred-acre-realm"}`

### 2. Main Application
Open your browser and go to: **http://localhost:3000**

### 3. Available Pages
- **Homepage**: http://localhost:3000
- **Characters**: http://localhost:3000/characters
- **Monsters**: http://localhost:3000/monsters
- **Natives**: http://localhost:3000/natives
- **Game Logs**: http://localhost:3000/game-logs

### 4. API Endpoints
- **Sessions**: http://localhost:3000/api/sessions
- **Characters**: http://localhost:3000/api/characters
- **Monsters**: http://localhost:3000/api/monsters
- **Health**: http://localhost:3000/api/health

## 🛠️ Development Commands

### Available npm scripts:
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Data Parsing Scripts:
```bash
# Process all game sessions
node scripts/process_all_sessions.js

# Process a single session
node scripts/process_session.js <session-name>

# Calculate scoring for a session
node scripts/calculate_scoring.js <session-name>
```

## 📁 Project Structure

```
hundreacrerealm/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── characters/        # Character pages
│   ├── monsters/          # Monsters page
│   ├── natives/           # Natives page
│   └── session/           # Session viewer
├── coregamedata/          # Parsed game data
├── parsed_sessions/       # Parsed game session logs
├── public/                # Static assets
├── scripts/               # Data parsing scripts
└── dev-setup.sh          # Development setup script
```

## 🔧 Troubleshooting

### Port 3000 Already in Use
```bash
# Stop all services
./dev-setup.sh stop

# Or kill the process manually
lsof -ti:3000 | xargs kill -9
```

### Dependencies Issues
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues
```bash
# Reset Docker environment
docker-compose down --volumes
docker system prune -f
./dev-setup.sh docker
```

### Health Check Fails
1. Check if the server is running: `./dev-setup.sh status`
2. Check logs: `docker-compose logs` (if using Docker)
3. Restart the service: `./dev-setup.sh stop && ./dev-setup.sh local`

## 📚 Next Steps

1. **Explore the Application**: Visit http://localhost:3000 and browse the different pages
2. **Test API Endpoints**: Try the various API endpoints listed above
3. **Add Game Sessions**: Place `.rslog` and `.rsgame` files in `public/uploads/` and run parsing scripts
4. **Review Documentation**: Check the main README.md for detailed information
5. **Start Developing**: Make changes to the code and see them reflected immediately

## 🆘 Need Help?

- Check the main [README.md](README.md) for comprehensive documentation
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Check [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for Docker-specific information
- Use `./dev-setup.sh help` for command reference

Happy coding! 🎮 