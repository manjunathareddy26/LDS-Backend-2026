#!/bin/bash

echo "🚀 Setting up LearnDataSkills Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your credentials"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create database
echo "🗄️  Creating PostgreSQL database..."
psql -U postgres -c "CREATE DATABASE login_auth;" 2>/dev/null || echo "Database already exists or couldn't create (it may already exist)"

# Test database connection
echo "🧪 Testing database connection..."
node test-db.js

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the server, run:"
echo "  npm start       (production mode)"
echo "  npm run dev     (development mode with auto-reload)"
echo ""
