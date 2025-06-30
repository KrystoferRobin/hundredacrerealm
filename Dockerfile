# Install dependencies only when needed
FROM --platform=linux/amd64 node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && apt-get install -y openssl
RUN npm install --frozen-lockfile

# Rebuild the source code only when needed
FROM --platform=linux/amd64 node:20-slim AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN apt-get update && apt-get install -y openssl
RUN npm run build

# Production image, copy all the files and run next
FROM --platform=linux/amd64 node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl

# Copy built assets and node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app ./app

EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"] 