#!/bin/sh
set -e

node /app/scripts/docker-init.js

exec "$@"
