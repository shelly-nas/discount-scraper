#!/bin/bash
# Install dependencies
npm install

# Install playwright dependencies
npx playwright install --with-deps

# Compile TypeScript
npm run build

# Remove the .env file if it exists
sudo rm -f .env

# Define the path to the .env file
ENV_FILE=".env"

# Write the environment variables to the .env file
{
    echo "LOG_LEVEL=${LOG_LEVEL}"
    echo "DB_PRODUCT=${DB_PRODUCT}"
    echo "DB_DISCOUNT=${DB_DISCOUNT}"
    echo "SUPERMARKET_WEB_CONFIG_SCHEMA=${SUPERMARKET_WEB_CONFIG_SCHEMA}"
    echo "NOTION_SECRET=${NOTION_SECRET}"
    echo "NOTION_DATABASE_ID=${NOTION_DATABASE_ID}"
} > $ENV_FILE

echo ".env file generated successfully!"
