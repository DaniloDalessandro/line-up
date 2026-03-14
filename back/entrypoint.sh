#!/bin/sh

echo "==> Waiting for database..."
sleep 5

echo "==> Running migrations..."
python manage.py migrate --noinput 2>&1
MIGRATE_EXIT=$?
echo "==> Migration exit code: $MIGRATE_EXIT"

if [ $MIGRATE_EXIT -ne 0 ]; then
    echo "ERROR: migrations failed! Sleeping to allow log inspection..."
    sleep 3600
    exit 1
fi

echo "==> Starting server..."
exec python manage.py runserver 0.0.0.0:8000
