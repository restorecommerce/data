### Base
FROM node:20.8.0-alpine3.18 as base

ENV DB_IMPORT_ENTRY="http://facade-srv:5000/graphql"
ENV OBJECT_IMPORT_ENDPOINT="http://facade-srv:5000/graphql"

USER node
ARG APP_HOME=/home/node/data
WORKDIR $APP_HOME

COPY *json *.js datasets ./
RUN npm ci

CMD ["sleep", "infinity"]