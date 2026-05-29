#!/bin/sh
set -e

# App runs as nextjs (uid 1001). Host-mounted realm-data is often owned by the
# deploy user, which causes EACCES when saving admin-users.json etc.
APP_USER=nextjs
APP_GROUP=nodejs

for dir in /app/public/parsed_sessions /app/public/stats /app/public/uploads /app/data; do
  if [ -d "$dir" ]; then
    chown -R "${APP_USER}:${APP_GROUP}" "$dir"
  fi
done

su-exec "${APP_USER}:${APP_GROUP}" node /app/scripts/docker-init.js
exec su-exec "${APP_USER}:${APP_GROUP}" "$@"
