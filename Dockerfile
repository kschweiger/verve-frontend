# ==========================================
# Stage 1: Builder
# ==========================================
# Keep Bun for dependency installation and provide Node for vue-tsc.
# vue-tsc patches the TypeScript compiler through Node module-loading hooks.
FROM oven/bun:1@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS bun
FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1 AS builder

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# 1. Copy dependency definitions
# We copy these alone first to leverage Docker layer caching.
# If package.json hasn't changed, this step (and the install) is cached.
COPY package.json bun.lock ./

# 2. Install dependencies
RUN bun install --frozen-lockfile

# 3. Copy the rest of the source code
COPY . .

# 4. Build Configuration
# Default to "/api" so the frontend works behind your reverse proxy automatically.
# This makes the image domain-agnostic.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 5. Build the app
RUN bun run build

# ==========================================
# Stage 2: Runtime
# ==========================================
# We use Alpine here because it's the final runtime, and we only need Nginx.
FROM nginx:alpine@sha256:fed7e14be83cbd2661a75cdc5b872d936cf155d46c327084d30b8df19ae88d72 AS production

# 1. Clean default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# 2. Copy the built artifacts from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# 3. Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 4. Expose Port
EXPOSE 80

# 5. Start Nginx
CMD ["nginx", "-g", "daemon off;"]
