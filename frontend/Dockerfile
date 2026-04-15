# Step 1: Build the application
# lockfileVersion 3 needs npm 7+ (Node 14 ships npm 6 and breaks npm ci).
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

# Step 2: Set up the production environment
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
