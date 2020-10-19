FROM node:12-alpine

RUN apk add --no-cache git

WORKDIR /data

COPY package.json package-lock.json ./
RUN npm install

COPY . .

CMD [ "sh", "-c", "node import.js -d $API_KEY" ]
