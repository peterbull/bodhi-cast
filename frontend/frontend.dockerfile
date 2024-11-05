FROM node:20 as build

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
COPY my-app/ ./

# Set environment variables
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN npm run build

# Serve the app with nginx
FROM nginx:1.25.3
COPY --from=build /usr/src/app/build /usr/share/nginx/html

EXPOSE 80


