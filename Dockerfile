### Base
FROM node:20.8.0-alpine3.18 as base

ARG DB_IMPORT_ENTRY=http://facade-srv:5000/graphql
ARG OBJECT_IMPORT_ENDPOINT=http://facade-srv:5000/graphql

ENV DB_IMPORT_ENTRY=$DB_IMPORT_ENTRY
ENV OBJECT_IMPORT_ENDPOINT=$OBJECT_IMPORT_ENDPOINT

USER node
ARG APP_HOME=/home/node/data
WORKDIR $APP_HOME

COPY --chown=node:node datasets ./datasets
COPY --chown=node:node *json *.js ./
RUN npm ci

CMD ["sleep", "infinity"]