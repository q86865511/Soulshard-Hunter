# Soulshard cloud backend. Runs on Oracle Ampere A1 (arm64) or x86 alike —
# node:20-alpine is multi-arch, so the same Dockerfile builds on both.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "src/server.js"]
