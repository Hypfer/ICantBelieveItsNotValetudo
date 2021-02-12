FROM node:lts-slim

WORKDIR /app

COPY package.json /app

# Build tools for armhf and arm64 to build canvas
RUN ARCH=$(dpkg --print-architecture) \ 
    && if [ "$ARCH" = "armhf" ] || [ "$ARCH" = "arm64" ]; then \
    apt-get update && apt-get install -y \
    build-essential \ 
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/* \
    ;  fi

RUN npm install
COPY . /app

CMD ["npm", "start"]
