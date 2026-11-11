# Same image as server/Dockerfile, but built from the REPO ROOT:  docker build -t vision .
# (The simulator now lives in server/simulation, so `docker build ./server` also works.)
FROM node:20-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci --include=dev
COPY server ./
RUN npm run build:sim && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/simulation ./simulation
EXPOSE 4000
CMD ["node", "dist/index.js"]
