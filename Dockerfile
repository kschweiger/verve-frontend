# ==========================================
# Stage 1: Builder
# ==========================================
# We use standard Debian-based Bun for maximum compatibility during build
FROM oven/bun:1@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS builder

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
FROM nginx:alpine@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2 AS production

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
