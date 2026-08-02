# Paper Cloud Games — relay server image
# Serves the built game (Roll-and-Move/dist) and relays WebSocket messages.
#
# Build from the repository root (the game must be built first):
#   cd Roll-and-Move && npm run build
#   cd .. && podman build -f SignalingServer/Dockerfile -t paper-cloud .

FROM node:22-alpine
WORKDIR /app

# server sources
COPY SignalingServer/package.json SignalingServer/package-lock.json* ./
RUN npm install --omit=dev

COPY SignalingServer/server.ts ./

# game build (built locally beforehand)
COPY Roll-and-Move/dist ./public

ENV PORT=8787
ENV PUBLIC_DIR=/app/public
EXPOSE 8787

CMD ["node", "server.ts"]
