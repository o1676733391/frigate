FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY mock-server.js .

EXPOSE 4000

CMD ["node", "mock-server.js"]
