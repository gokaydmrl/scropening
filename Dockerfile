FROM node:20-slim

WORKDIR /app

# Copy dependency manifests and install
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js production bundle
RUN npm run build

# Default command (overridden in docker-compose for the worker service)
CMD ["npm", "run", "start"]