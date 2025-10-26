#!/bin/bash

# Build script for Render deployment (Web)
echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building web app..."
pnpm --filter web build

echo "✅ Build complete!"
