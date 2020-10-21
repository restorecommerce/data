FROM node:12.18.3-alpine

WORKDIR /data

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

CMD [ "sh", "-c", "node import.js -d $API_KEY" ]
