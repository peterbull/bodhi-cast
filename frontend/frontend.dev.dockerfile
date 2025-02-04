FROM node:20 AS build

RUN apt-get update && apt-get install -y \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  build-essential \
  python3

# Build the react app
WORKDIR /usr/src/app
COPY my-app/package.json my-app/package-lock.json ./
RUN npm install
COPY ./my-app . 

EXPOSE 3000
