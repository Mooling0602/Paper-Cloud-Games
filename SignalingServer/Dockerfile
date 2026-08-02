# Paper Cloud Games — relay server image
# Serves the built game (Roll-and-Move/dist) and relays WebSocket messages.

FROM node:22-alpine
WORKDIR /app

# server sources
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.ts ./

# game build (built locally beforehand)
COPY ../Roll-and-Move/dist ./public

ENV PORT=8787
ENV PUBLIC_DIR=/app/public
EXPOSE 8787

CMD ["node", "server.ts"]
