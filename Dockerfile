# The local run and the test run (AD-17). Vercel never builds this file.
FROM node:26.13.1-trixie-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx next build

FROM node:26.13.1-trixie-slim AS app
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["npm", "run", "serve"]

FROM deps AS test
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["npm", "test"]
