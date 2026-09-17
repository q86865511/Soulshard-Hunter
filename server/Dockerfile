# Build from the repository root: docker build -f server/Dockerfile .
# Node 22 serves the API and isolated rooms using the shared game modules.
FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY src /app/src
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "src/server.js"]
