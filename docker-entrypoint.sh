#!/bin/sh

# wait for postgres to become ready
sleep 30

# Run database migrations
yarn run db:deploy

# Create/update role accounts (idempotent — safe on every deploy)
yarn run db:init

# Start the application
yarn run start:prod