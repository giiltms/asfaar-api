#!/bin/sh

# wait for postgres to become ready
sleep 30

# Run database migrations
yarn run db:deploy

# Seed the database
yarn run seed

# Start the application
yarn run start:prod