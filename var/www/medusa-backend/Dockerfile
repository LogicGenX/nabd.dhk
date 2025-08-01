FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install -g @medusajs/medusa-cli && npm install && apk add --no-cache postgresql-client
COPY . .
# Normalize line endings and ensure the entrypoint script is executable
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
# Use an absolute path when invoking the entrypoint and enable -e to abort on errors
ENTRYPOINT ["/bin/sh", "-e", "/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
