# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Vite project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built Vite files from builder
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server.js .

# Expose ports
EXPOSE 3000 5173

# Start the server
CMD ["node", "server.js"]
