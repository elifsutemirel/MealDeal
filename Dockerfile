# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies from lockfile first.
RUN npm ci

# Rollup optional native package can be skipped by npm on Alpine; install the
# correct one for the current target architecture explicitly.
ARG TARGETARCH
RUN npm install --no-save @rollup/rollup-linux-${TARGETARCH}-musl@4.60.0

# Copy source code
COPY . .

# Add build args for Vite environment variables
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build the Vite project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built Vite files from builder
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server.js .

# Expose ports
EXPOSE 3000 5173

# Start the server
CMD ["node", "server.js"]
