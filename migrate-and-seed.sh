#!/bin/bash

# Migration and Seeding Script for Render Deployment
# This script runs database migrations and seeds data

echo "🚀 Starting database setup..."

# Navigate to database package
cd packages/database || exit 1

echo "📦 Installing dependencies..."
pnpm install

echo "🔄 Running database migrations..."
pnpm db:migrate

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed"
    exit 1
fi

echo "🌱 Seeding database..."
pnpm db:seed

if [ $? -eq 0 ]; then
    echo "✅ Database seeded successfully"
else
    echo "❌ Seeding failed"
    exit 1
fi

echo "🎉 Database setup complete!"
