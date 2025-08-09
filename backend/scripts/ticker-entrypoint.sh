#!/bin/sh
# ticker-entrypoint.sh

# Run the wait-for-it script, targeting the 'backend' service on port 8000
./scripts/wait-for-it.sh backend python manage.py start_ticker