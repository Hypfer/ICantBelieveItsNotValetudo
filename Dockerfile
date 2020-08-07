FROM node:14-stretch-slim

WORKDIR /app

COPY package.json /app
RUN npm install
COPY . /app

CMD ["npm", "start"]