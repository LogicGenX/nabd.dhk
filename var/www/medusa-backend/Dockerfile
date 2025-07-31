FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install && apk add --no-cache postgresql-client
COPY . .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
