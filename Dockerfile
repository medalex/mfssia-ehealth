# ---- STAGE 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# ---- STAGE 2: builder ----
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- STAGE 3: prod ----
FROM node:20-alpine AS prod
WORKDIR /usr/src/app

RUN addgroup -S app && adduser -S -G app app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules

ENV NODE_ENV=development
ENV PORT=4000

RUN chown -R app:app /usr/src/app

EXPOSE 4000
USER app

CMD ["node", "dist/src/main.js"]
