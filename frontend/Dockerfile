# Build stage
FROM node:20-alpine AS build-stage

ENV NODE_ENV=development

WORKDIR /app

# Copy package files first to leverage standard Docker layer caching
COPY package.json package-lock.json* ./

# Configure npm for network resilience
RUN npm config set fetch-retry-maxtimeout 60000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retries 3

# Install all dependencies cleanly without cache mounts (avoids stale cache locks hanging the build)
RUN npm install --production=false

# Copy remaining source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
