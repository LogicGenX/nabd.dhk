#!/bin/bash
set -e

DOMAIN="${DOMAIN:-$1}"
EMAIL="${EMAIL:-$2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo 'Usage: DOMAIN=example.com EMAIL=admin@example.com bash deploy.sh'
  echo '   or: bash deploy.sh example.com admin@example.com'
  exit 1
fi

sudo apt update
sudo apt install -y curl nginx docker.io docker-compose certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo yarn global add pm2

# clone repo assumed already present at /var/www
cd /var/www/sanity-studio
yarn install
yarn build

cd /var/www/medusa-backend
cp .env.template .env
sudo docker compose up -d

cd /var/www/frontend-next
yarn install
yarn build

sudo ln -sf /var/www/server-config/nginx.conf /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

sudo certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" || true

pm2 start /var/www/server-config/pm2-universe.json
pm2 save
