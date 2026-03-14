#!/bin/sh

echo "==> Waiting for database..."
sleep 5

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Starting gunicorn with gthread worker..."
export OPENBLAS_NUM_THREADS=1
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --worker-class gthread \
    --threads 4 \
    --timeout 120
