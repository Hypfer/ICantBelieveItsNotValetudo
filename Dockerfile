FROM node:lts-alpine

WORKDIR /app

COPY package.json /app
RUN npm install \
  && touch config.json
COPY . /app

CMD ["npm", "start"]