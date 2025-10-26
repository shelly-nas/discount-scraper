# Use Node.js LTS version
FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.56.1-jammy

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create logs directory
RUN mkdir -p logs

# Expose the API port
EXPOSE 3000

# Start the API server
CMD ["node", "dist/index.js"]
