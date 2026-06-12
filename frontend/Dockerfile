# Build stage
FROM node:20-alpine AS build-stage

ENV NODE_ENV=development

WORKDIR /app

# Copy all source files first
COPY . .

# Delete any copied node_modules or lockfiles to guarantee a clean installation
RUN rm -rf node_modules package-lock.json

# Force a clean install of all dependencies (including devDependencies)
RUN npm install --production=false

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
