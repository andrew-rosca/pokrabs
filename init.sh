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

# Set up environment file
echo ""
echo "🗄️  Setting up environment and database..."
if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cat > .env << 'ENVEOF'
# POKRABS Environment Configuration

# ============================================
# Database Configuration
# ============================================
DATABASE_TYPE=sqlite
DATABASE_URL=./data/pokrabs.db

# ============================================
# Server Configuration
# ============================================
PORT=3001
NODE_ENV=development

# ============================================
# Authentication Configuration
# ============================================
AUTH_MODE=demo
SESSION_SECRET=default-secret-change-in-production-dev-only

# ============================================
# OAuth Configuration (Google)
# ============================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_CALLBACK_URL=
FRONTEND_URL=http://localhost:5173

# ============================================
# Production Security Settings
# ============================================
ALLOWED_ORIGINS=

# ============================================
# Optional/Development Settings
# ============================================
DEBUG=
ENVEOF
    echo "   ✅ .env file created"
else
    echo "   .env file already exists"
fi

# Run database migrations if available
cd backend
if [ -f "package.json" ] && grep -q "prisma" package.json; then
    echo "   Running database migrations..."
    # Prisma requires file: protocol for SQLite
    # Use migrate deploy to apply pending migrations (idempotent, safe to run multiple times)
    DATABASE_URL="file:./data/pokrabs.db" npx prisma migrate deploy || echo "   ⚠️  Migration failed (this is okay if database already exists or migrations will run on startup)"
    # Generate Prisma client
    echo "   Generating Prisma client..."
    npx prisma generate || echo "   ⚠️  Prisma generate failed"
fi
cd ..

echo ""
echo "✅ Initialization complete!"
echo ""
echo "To start development (runs both backend and frontend):"
echo "  npm run dev"
echo ""

