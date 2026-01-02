#!/bin/bash

# POKRABS Database Seeding Demo Script
#
# This script demonstrates the database seeding functionality

set -e

echo "========================================="
echo "POKRABS Database Seeding Demo"
echo "========================================="
echo ""

# Navigate to backend
cd "$(dirname "$0")/backend"

# Function to count problems
count_problems() {
  curl -s http://localhost:3000/api/projects/default-project-1/problems 2>/dev/null | jq 'length' 2>/dev/null || echo "0"
}

# Check if backend is running
if ! curl -s http://localhost:3000/api/projects > /dev/null 2>&1; then
  echo "Error: Backend server is not running at http://localhost:3000"
  echo "Please run 'npm run dev' from the project root first."
  exit 1
fi

echo "1. Checking current problem count..."
INITIAL_COUNT=$(count_problems)
echo "   Current problems: $INITIAL_COUNT"
echo ""

echo "2. Seeding with SMALL dataset..."
npm run db:seed 2>&1 | grep -E "(Seeding|Created|complete|problems)"
echo ""

echo "3. Checking problem count after small seed..."
SMALL_COUNT=$(count_problems)
echo "   Problems after small seed: $SMALL_COUNT"
echo ""

echo "4. Seeding with LARGE dataset..."
npm run db:seed:large 2>&1 | grep -E "(Seeding|Created|Generating|complete|problems)"
echo ""

echo "5. Checking problem count after large seed..."
LARGE_COUNT=$(count_problems)
echo "   Problems after large seed: $LARGE_COUNT"
echo ""

echo "========================================="
echo "Demo Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Small dataset: $SMALL_COUNT problems"
echo "  - Large dataset: $LARGE_COUNT problems"
echo ""
echo "The large dataset is now loaded in your database."
echo "Open http://localhost:5173 to test scrolling with $LARGE_COUNT problems!"
echo ""

