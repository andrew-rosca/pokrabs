#!/bin/bash

# POKRABS Seeding Statistics Script
#
# Shows statistics about the seeded data

set -e

echo "========================================="
echo "POKRABS Database Statistics"
echo "========================================="
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000/api/projects > /dev/null 2>&1; then
  echo "Error: Backend server is not running at http://localhost:3000"
  echo "Please run 'npm run dev' from the project root first."
  exit 1
fi

# Get all problems
PROBLEMS=$(curl -s http://localhost:3000/api/projects/default-project-1/problems)

echo "📊 Overall Statistics"
echo "────────────────────────────────────────"
TOTAL=$(echo "$PROBLEMS" | jq 'length')
ROOT=$(echo "$PROBLEMS" | jq '[.[] | select(.parentId == null)] | length')
CHILDREN=$(echo "$PROBLEMS" | jq '[.[] | select(.parentId != null)] | length')
echo "Total Problems:    $TOTAL"
echo "Root Problems:     $ROOT"
echo "Child Problems:    $CHILDREN"
echo ""

echo "📈 Status Distribution"
echo "────────────────────────────────────────"
echo "$PROBLEMS" | jq -r 'group_by(.status) | map({status: .[0].status, count: length}) | .[] | "  \(.status): \(.count)"'
echo ""

echo "🏷️  Label Distribution (Top 10)"
echo "────────────────────────────────────────"
echo "$PROBLEMS" | jq -r '[.[] | .labels[]] | group_by(.) | map({label: .[0], count: length}) | sort_by(.count) | reverse | .[:10] | .[] | "  \(.label): \(.count)"'
echo ""

echo "🔍 Sample Root Problems (First 5)"
echo "────────────────────────────────────────"
echo "$PROBLEMS" | jq -r '[.[] | select(.parentId == null)] | .[:5] | .[] | "  [\(.idPath)] \(.problem | fromjson | .summary)"'
echo ""

echo "📁 Hierarchy Statistics"
echo "────────────────────────────────────────"
MAX_DEPTH=$(echo "$PROBLEMS" | jq '[.[] | .idPath | split("-") | length] | max')
echo "Maximum Depth:     $MAX_DEPTH levels"
echo ""

# Count problems at each depth
echo "Problems by depth:"
for i in $(seq 1 $MAX_DEPTH); do
  COUNT=$(echo "$PROBLEMS" | jq "[.[] | select((.idPath | split(\"-\") | length) == $i)] | length")
  echo "  Level $i:           $COUNT problems"
done

echo ""
echo "========================================="
echo ""
echo "✅ Database is seeded with diverse test data"
echo "🌐 View at: http://localhost:5173"
echo ""

