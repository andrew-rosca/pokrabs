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
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}POKRABS Demo - Quick Start${NC}"
echo ""

# Check for required commands
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed or not in PATH${NC}" >&2
        return 1
    fi
    return 0
}

# Check for docker-compose or docker compose (v2)
COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}Error: docker-compose is not installed${NC}" >&2
    echo ""
    echo "Please install Docker Compose:"
    echo "  - Docker Desktop includes docker-compose automatically"
    echo "  - Or install separately: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check for curl
if ! check_command curl; then
    echo ""
    echo "Please install curl:"
    echo "  - macOS: curl is usually pre-installed"
    echo "  - Linux: sudo apt-get install curl (Debian/Ubuntu) or sudo yum install curl (RHEL/CentOS)"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}" >&2
    echo ""
    echo "Please start Docker:"
    echo "  - macOS/Windows: Start Docker Desktop application"
    echo "  - Linux: sudo systemctl start docker"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo -e "${GREEN}✓ docker-compose is available${NC}"
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
TMP_DIR="/tmp/pokrabs-$$"
mkdir -p "$TMP_DIR"
COMPOSE_FILE="$TMP_DIR/docker-compose.demo-pull.yml"

if ! curl -sSL "https://raw.githubusercontent.com/${GH_USERNAME}/${REPO}/${BRANCH}/docker-compose.demo-pull.yml" -o "$COMPOSE_FILE"; then
    echo -e "${RED}Error: Failed to download docker-compose configuration${NC}" >&2
    echo ""
    echo "Please check:"
    echo "  - Your internet connection"
    echo "  - The repository URL is accessible"
    echo "  - The branch name is correct (currently: ${BRANCH})"
    exit 1
fi

# Verify the file was downloaded and is not empty
if [ ! -s "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: Downloaded docker-compose file is empty${NC}" >&2
    exit 1
fi

echo -e "${GREEN}✓ Configuration downloaded${NC}"

# Pull images explicitly before starting to ensure we're using published images
echo -e "${YELLOW}Pulling published images...${NC}"
cd "$TMP_DIR"
PROJECT_NAME="pokrabs-demo-$$"
$COMPOSE_CMD -p "$PROJECT_NAME" -f docker-compose.demo-pull.yml pull || {
    echo -e "${RED}Warning: Failed to pull some images. They will be pulled on startup.${NC}" >&2
}
echo -e "${GREEN}✓ Images ready${NC}"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM


echo ""
echo -e "${GREEN}Starting POKRABS demo...${NC}"
echo "Images: ${GHCR_FRONTEND_IMAGE} and ${GHCR_BACKEND_IMAGE}"
echo "Project name: ${PROJECT_NAME}"
echo ""
echo "The application will be available at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

# Use the detected compose command
# Images should already be pulled, but we'll start the services
# This compose file only has image: directives, no build: directives
$COMPOSE_CMD -p "$PROJECT_NAME" -f docker-compose.demo-pull.yml up

