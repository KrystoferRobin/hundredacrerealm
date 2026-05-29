# Docker deployment (homelab)

Production image: `ghcr.io/krystoferrobin/hundredacrerealm:latest` (built on every push to `main`).

## Quick start on Ubuntu

```bash
git clone https://github.com/KrystoferRobin/hundredacrerealm.git
cd hundredacrerealm

cp .env.docker.example .env
# Edit .env — set JWT_SECRET and BASE_URL (your external URL)

mkdir -p realm-data/{parsed_sessions,stats,uploads,data}

# Optional: copy existing session data
# cp -a public/parsed_sessions/* realm-data/parsed_sessions/

docker compose pull
docker compose up -d
```

Open `http://your-server:${HOST_PORT}` (or your reverse proxy URL).

## Configuration

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required for admin login |
| `BASE_URL` | Public site URL for session links and webhook embeds |
| `HOST_PORT` | Host port mapped to container port 3000 |
| `REALM_DATA_DIR` | Single folder for all persistent data (default `./realm-data`) |
| `REALM_IMAGE_TAG` | Image tag to pull (default `latest`) |

## Persistence

All mutable data is stored under one host directory (default `./realm-data`):

```
realm-data/
  parsed_sessions/   # processed game sessions
  stats/             # master stats and session titles
  uploads/           # incoming .rsgame / .rslog uploads
  data/              # admin users, API keys, webhook settings, registry
```

Core game data (`coregamedata/`) and static assets ship inside the image.

On first start, config templates are copied from `/app/config-seed` into the mounted `realm-data/data/` directory (admin users, API keys, session registry). Change the default admin password immediately — the seeded file uses `CHANGE_ME`.

## First-time admin login

After the container starts, open `/admin`. Default credentials from the seeded file:

- Username: `admin`
- Password: `CHANGE_ME` (change this in Admin → Users or by editing `realm-data/data/admin-users.json`)

If saving admin settings fails with `EACCES` on `/app/data/admin-users.json`, the mounted `realm-data` files are owned by your host user, not the container user. Either upgrade to the latest image (entrypoint fixes ownership on start) or run once:

```bash
sudo chown -R 1001:1001 realm-data
docker compose restart
```

If logs show `Example file missing, skipping seed`, the data volume hid the old image templates. Either upgrade to the latest image (uses `config-seed`) or copy templates manually from the clone:

```bash
cp data/admin-users.example.json realm-data/data/admin-users.json
cp data/realm-api-keys.example.json realm-data/data/realm-api-keys.json
cp data/realm-session-registry.example.json realm-data/data/realm-session-registry.json
docker compose restart
```

## Operations

```bash
docker compose logs -f
docker compose pull && docker compose up -d   # upgrade to latest
docker compose down
```

Health check: `GET /api/health`

## Build locally

```bash
docker build -t hundred-acre-realm:local .
docker run --rm -p 3000:3000 --env-file .env \
  -v "$(pwd)/realm-data/parsed_sessions:/app/public/parsed_sessions" \
  -v "$(pwd)/realm-data/stats:/app/public/stats" \
  -v "$(pwd)/realm-data/uploads:/app/public/uploads" \
  -v "$(pwd)/realm-data/data:/app/data" \
  hundred-acre-realm:local
```

## GitHub Container Registry

After the workflow runs on `main`, pull with:

```bash
docker pull ghcr.io/krystoferrobin/hundredacrerealm:latest
```

If the package is private, authenticate with a GitHub PAT that has `read:packages`:

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
