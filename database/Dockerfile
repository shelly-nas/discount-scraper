# Use official PostgreSQL image
FROM postgres:15-alpine

# Default environment variables (can be overridden by docker-compose)
# These are just fallbacks - docker-compose.yml will provide the actual values
ENV POSTGRES_DB=discount
ENV POSTGRES_USER=discount_user

# Copy initialization scripts
# PostgreSQL will execute these in alphabetical order
COPY src/schema.sql /docker-entrypoint-initdb.d/01-schema.sql

# Expose PostgreSQL port
EXPOSE 5432

# The postgres image already has a health check, but we can customize it
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Data volume
VOLUME ["/var/lib/postgresql/data"]
