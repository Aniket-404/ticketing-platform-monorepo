#!/bin/bash

# Build script for Render deployment
echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building database package..."
pnpm --filter @repo/database build

echo "🔨 Building API..."
pnpm --filter api build

echo "✅ Build complete!"
