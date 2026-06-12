# Build stage
FROM node:20-alpine AS build-stage

ENV NODE_ENV=development

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Configure npm to be more resilient to network failures and slow connections
RUN npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retries 5

# Install all dependencies (including devDependencies) using cache mounts
RUN --mount=type=cache,target=/root/.npm \
    npm ci || npm install --production=false

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
