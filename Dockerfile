FROM node:18-slim

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port (Koyeb can use 3000 or any port via PORT env)
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server/server.js"]
