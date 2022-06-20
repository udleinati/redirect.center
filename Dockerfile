FROM node:18 AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:18 AS production

WORKDIR /app

COPY --from=base /app/package*.json ./

RUN npm ci --omit=dev

COPY --from=base /app/dist ./dist

CMD npm run start:prod
