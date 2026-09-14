FROM node:22-alpine
WORKDIR /usr/src/repo

# Il build context è la root del repo (richiesto dagli npm workspaces): copiamo prima solo i
# manifest per sfruttare la cache dei layer Docker, poi installiamo, poi copiamo il codice.
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY mock-server/package.json ./mock-server/
RUN npm ci --omit=dev

COPY app ./app

WORKDIR /usr/src/repo/app
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
