# Vision backend — builds and runs the TypeScript API/brain server.
FROM node:20-alpine AS build

# Build tools for native modules (canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build:sim && npm run build

# Keep only production dependencies
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Runtime libraries needed by canvas
RUN apk add --no-cache \
    pixman \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg

# Copy built app + already-compiled node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/simulation ./simulation

EXPOSE 4000
CMD ["node", "dist/index.js"]