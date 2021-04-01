FROM node:12.18.3-alpine

WORKDIR /

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

ENTRYPOINT ["node", "import.js"]
