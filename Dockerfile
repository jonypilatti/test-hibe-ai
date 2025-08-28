FROM node:22-slim

# Install dependencies for node-gyp and sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code (excluding database files via .dockerignore)
COPY . .

# Build the application
RUN npm run build

# Create necessary directories (clean, without existing DB)
RUN mkdir -p database logs

# Ensure database directory is empty and has correct permissions
RUN rm -rf database/* && chmod 755 database

# Remove devDependencies after build
RUN npm prune --production

# Create startup script that runs migrations first
RUN echo '#!/bin/bash\nset -e\necho "🔄 Running database migrations..."\nnode dist/database/migrate.js\necho "✅ Migrations completed, starting application..."\nexec npm start' > /app/start.sh && chmod +x /app/start.sh

# Create non-root user for security
RUN groupadd -g 1001 nodejs
RUN useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["/app/start.sh"]
