FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY .env.example ./.env.example

ENV PORT=5055
EXPOSE 5055

CMD ["npm", "start"]
