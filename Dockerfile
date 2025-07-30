# Use the official Node.js 16 image as the base image
FROM node:22-bullseye AS build

WORKDIR /app

# Set Prisma CLI version
ENV PRISMA_CLI_VERSION=3.0.0


# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install
# --frozen-lockfile

# Copy the rest of the application code to the working directory
COPY . .

# Copy the entry point script
COPY docker-entrypoint.sh ./

# Make the entry point script executable
RUN chmod +x docker-entrypoint.sh

# Generate Prisma client files
RUN npx prisma generate

# Build the application
RUN yarn build

# ---------------------------------------
# Development Stage (with live reload)
# ---------------------------------------
  FROM node:22-bullseye AS development

  WORKDIR /app
  
  # Install nodemon globally for hot reload
  RUN yarn global add nodemon
  
  # Copy dependencies and source code from base stage
  COPY --from=build /app /app
  
  # Expose the port for development
  EXPOSE 3000
  
  # Set environment variables for development
  ENV NODE_ENV=development
  
  # Run the app with nodemon for auto-reloading
  CMD ["yarn", "start:dev"]


# ---------------------------------------
# Production stage
# ---------------------------------------
FROM node:22-bullseye AS production

WORKDIR /app

# Copy the production build from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/docker-entrypoint.sh ./
# Copy generated prisma client from previous step
COPY --from=build /app/node_modules/.prisma/client  ./node_modules/.prisma/client
# Copy prisma schema and migrations - (workaround to fix finding prisma schema in production)
COPY --from=build /app/prisma ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Expose the port on which your NestJS app is listening
ARG APP_PORT=3000
ARG BASE_URL='http://localhost:${APP_PORT}}'
EXPOSE ${APP_PORT}

# Set NODE_ENV to production
ENV NODE_ENV=production

# Use the entry point script to start the container
ENTRYPOINT ["/app/docker-entrypoint.sh"]
