# Install dependencies
npm install

# Compile TypeScript
npm run build

# Create .env file
cat <<EOL >> .env
LOG_LEVEL=INFO
DB_PRODUCT=./database/Product.json
DB_DISCOUNT=./database/Discount.json
SUPERMARKET_WEB_CONFIG_SCHEMA=config/supermarketWebConfigSchema.json
NOTION_SECRET=${NOTION_SECRET}
NOTION_DATABASE_ID=${NOTION_DATABASE_ID}
EOL