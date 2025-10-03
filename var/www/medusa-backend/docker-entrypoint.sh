#!/bin/sh
set -e

cd /app/

node -e "const fs=require('fs');if(fs.existsSync('src')&&!fs.existsSync('dist')){fs.cpSync('src','dist',{recursive:true});console.log('[entrypoint] copied src -> dist')}"
exec node scripts/migrate-and-start.js
