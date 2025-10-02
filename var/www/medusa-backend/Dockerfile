FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN corepack enable && yarn global add @medusajs/medusa-cli && yarn install && apk add --no-cache postgresql-client
COPY . .
RUN yarn build:dist
# Normalize line endings and ensure the entrypoint script is executable
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
# Use an absolute path when invoking the entrypoint and enable -e to abort on errors
ENTRYPOINT ["/bin/sh", "-e", "/app/docker-entrypoint.sh"]
CMD ["yarn", "start"]
