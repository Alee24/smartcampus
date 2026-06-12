# Build stage
FROM node:20-alpine AS build-stage

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --include=dev

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
