### Base
FROM node:20.8.0-alpine3.18 as base

USER node
ARG APP_HOME=/home/node/data
WORKDIR $APP_HOME

COPY *json *.js datasets ./
RUN npm ci

USER root
USER node