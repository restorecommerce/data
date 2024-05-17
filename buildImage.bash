#!/bin/bash

SERVICE_NAME="data"

DOCKER_BUILDKIT=1 docker build \
  --tag restorecommerce/$SERVICE_NAME \
  -f ./Dockerfile \
  --cache-from restorecommerce/$SERVICE_NAME \
  --build-arg APP_HOME=/home/node/$SERVICE_NAME \
  --build-arg DB_IMPORT_ENTRY=http://facade-srv:5000/graphql \
  --build-arg OBJECT_IMPORT_ENDPOINT=http://facade-srv:5000/graphql \
  .
