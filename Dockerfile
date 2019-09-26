FROM node:lts-buster-slim
ENV NODE_ENV production

RUN npm install pm2 -g

WORKDIR /app

COPY package.json ./
#COPY package-lock.json ./

RUN npm install

COPY ./src ./src/
COPY ./views ./views/

# https://medium.com/@mccode/processes-in-containers-should-not-run-as-root-2feae3f0df3b
RUN groupadd -g 999 appuser && \
    useradd -r -u 999 -g appuser appuser && \
    mkdir -p /home/appuser && \
    chown -R appuser:appuser /home/appuser
USER appuser

ENV PORT 3000
EXPOSE 3000
CMD [ "pm2-runtime", "src/index.js" ]

