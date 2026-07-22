# Stage 1: Build TanStack Start app (Nitro node-server preset)
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run Nitro Node server (.output — not dist/)
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/.output ./

ENV HOST=0.0.0.0
ENV PORT=80

EXPOSE 80

CMD ["node", "server/index.mjs"]
