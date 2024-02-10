FROM node:20-slim as build

# Build the react app
WORKDIR /usr/src/app
COPY my-app/package.json my-app/package-lock.json ./
RUN npm install
COPY ./my-app . 

EXPOSE 3000