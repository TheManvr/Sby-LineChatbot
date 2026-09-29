FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY src ./src
COPY data ./data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "index.js"]

