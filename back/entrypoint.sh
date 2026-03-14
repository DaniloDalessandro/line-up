#!/bin/sh

echo "==> Waiting for database..."
sleep 5

echo "==> Running migrations..."
python manage.py migrate --noinput
if [ $? -ne 0 ]; then
    echo "ERROR: migrations failed!"
    exit 1
fi

echo "==> Starting gunicorn..."
exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 1 --timeout 120 --log-level debug
