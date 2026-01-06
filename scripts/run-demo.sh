#!/bin/bash
# Quick start script for POKRABS Demo
# This script downloads the docker-compose file and runs the demo using published images
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/andrew-rosca/pokrabs/main/scripts/run-demo.sh | bash
#
# Or download and run:
#   curl -sSL https://raw.githubusercontent.com/andrew-rosca/pokrabs/main/scripts/run-demo.sh -o run-demo.sh
#   bash run-demo.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}POKRABS Demo - Quick Start${NC}"
echo ""

# GitHub repository info
GH_USERNAME="andrew-rosca"
REPO="pokrabs"
BRANCH="main"  # Change this if your default branch is different

# Set image environment variables
export GHCR_USERNAME="$GH_USERNAME"
export GHCR_FRONTEND_IMAGE="ghcr.io/${GH_USERNAME}/pokrabs-frontend:latest"
export GHCR_BACKEND_IMAGE="ghcr.io/${GH_USERNAME}/pokrabs-backend:latest"

echo -e "${YELLOW}Downloading docker-compose configuration...${NC}"
COMPOSE_FILE="/tmp/pokrabs-demo-$$.yml"
curl -sSL "https://raw.githubusercontent.com/${GH_USERNAME}/${REPO}/${BRANCH}/docker-compose.demo.yml" -o "$COMPOSE_FILE"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    rm -f "$COMPOSE_FILE"
}
trap cleanup EXIT INT TERM

echo -e "${GREEN}Starting POKRABS demo...${NC}"
echo "Images: ${GHCR_FRONTEND_IMAGE} and ${GHCR_BACKEND_IMAGE}"
echo ""
echo "The application will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

docker-compose -f "$COMPOSE_FILE" up

