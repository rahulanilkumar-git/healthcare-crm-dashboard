#!/bin/sh
set -e

if [ ! -f vendor/autoload.php ]; then
  composer install
fi

cp -n .env.example .env || true

if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
fi

if ! grep -q '^JWT_SECRET=.\+' .env; then
  php artisan jwt:secret --force
fi

php artisan migrate --force

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  php artisan db:seed --force
fi

php artisan serve --host=0.0.0.0 --port=8000
