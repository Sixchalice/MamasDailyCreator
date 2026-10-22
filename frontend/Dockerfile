# lockfileVersion 3 needs npm 7+ (Node 14 ships npm 6 and breaks npm ci).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# nginx's entrypoint runs envsubst on /etc/nginx/templates/*.template at start.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
ENV BACKEND_URL=http://backend:9000
EXPOSE 80
