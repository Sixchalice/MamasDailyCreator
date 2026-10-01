# lockfileVersion 3 needs npm 7+ (Node 14 ships npm 6 and breaks npm ci).
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "start"]
