FROM node:20-slim as build

# Production

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
FROM nginx:alpine
COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY ./my-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Development

# # Build the react app
# WORKDIR /usr/src/app
# COPY my-app/package.json my-app/package-lock.json ./
# RUN npm install
# COPY ./my-app . 

# EXPOSE 3000

