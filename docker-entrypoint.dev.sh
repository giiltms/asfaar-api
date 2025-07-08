#!/bin/sh

# Run database migrations
yarn run db:deploy

# Seed the database
yarn run seed

# Start the application
yarn run start:dev