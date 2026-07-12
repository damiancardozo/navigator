FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json* tsconfig.json tsconfig.base.json ./
COPY packages ./packages
RUN npm install
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*
ENV NAVIGATOR_CHROME_PATH=/usr/bin/google-chrome
COPY package.json package-lock.json* ./
COPY --from=build /app/packages ./packages
RUN npm install --omit=dev
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@navigator/agent"]
