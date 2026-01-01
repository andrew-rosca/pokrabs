#!/bin/bash

# POKRABS Project Initialization Script
# This script sets up the development environment

set -e

echo "🚀 Initializing POKRABS development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies (including concurrently)
echo ""
echo "📦 Installing root dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   Root dependencies already installed"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   Frontend dependencies already installed"
fi
cd ..

# Set up database
echo ""
echo "🗄️  Setting up database..."
cd backend
if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cp .env.example .env 2>/dev/null || echo "DATABASE_TYPE=sqlite" > .env
fi

# Run database migrations/seeding if available
if [ -f "package.json" ] && grep -q "\"db:setup\"" package.json; then
    npm run db:setup || echo "   Database setup script not available yet"
fi
cd ..

echo ""
echo "✅ Initialization complete!"
echo ""
echo "To start development (runs both backend and frontend):"
echo "  npm run dev"
echo ""

