#!/bin/bash
set -e

# This script is called by PostgreSQL on first start
# It creates users and initializes the database

echo "=== Starting PostgreSQL initialization ==="

# The standard postgres initialization happens first (creating default postgres role)
# Then schema.sql is executed
# This script just modifies configuration after that

if [ ! -f /var/lib/postgresql/data/initialized ]; then
    echo "First run: Setting up database configuration..."
    
    # Wait for postgres to be ready and accepting connections
    sleep 3
    
    # Modify pg_hba.conf to use trust authentication for local connections
    # This is already done by sed in the main command, but we document it here
    
    touch /var/lib/postgresql/data/initialized
fi

echo "=== PostgreSQL initialization complete ==="
exec "$@"
