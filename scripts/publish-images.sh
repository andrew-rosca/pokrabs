#!/bin/bash
# Publish POKRABS Docker images to GitHub Container Registry (GHCR)
#
# Prerequisites:
#   1. Docker must be installed and running
#   2. You must be authenticated with GHCR (run ./scripts/docker-login-ghcr.sh)
#   3. GHCR_USERNAME environment variable must be set
#
# Usage:
#   export GHCR_USERNAME=your-username
#   ./scripts/publish-images.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GHCR_USERNAME is set
if [ -z "$GHCR_USERNAME" ]; then
    echo -e "${RED}Error: GHCR_USERNAME environment variable is not set${NC}"
    echo "Please set it with: export GHCR_USERNAME=your-username"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}Publishing POKRABS images to GHCR...${NC}"
echo "Registry: ghcr.io"
echo "Username: $GHCR_USERNAME"
echo ""

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Image names
BACKEND_IMAGE="ghcr.io/${GHCR_USERNAME}/pokrabs-backend:latest"
FRONTEND_IMAGE="ghcr.io/${GHCR_USERNAME}/pokrabs-frontend:latest"

# Check if buildx is available
if ! docker buildx version > /dev/null 2>&1; then
    echo -e "${RED}Error: docker buildx is not available${NC}"
    echo "Please install Docker Buildx or update Docker Desktop"
    exit 1
fi

# Create and use a buildx builder if it doesn't exist
BUILDER_NAME="pokrabs-builder"
if ! docker buildx inspect "$BUILDER_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}Creating buildx builder: $BUILDER_NAME...${NC}"
    docker buildx create --name "$BUILDER_NAME" --use
fi

# Use the builder
docker buildx use "$BUILDER_NAME"

# Build and publish backend (multi-arch: amd64 and arm64)
echo -e "${YELLOW}Building backend image for amd64 and arm64...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f docker/Dockerfile.backend \
    -t "$BACKEND_IMAGE" \
    --push \
    .

echo -e "${GREEN}✓ Backend image published (multi-arch)${NC}"
echo ""

# Build and publish frontend (multi-arch: amd64 and arm64)
echo -e "${YELLOW}Building frontend image for amd64 and arm64...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f docker/Dockerfile.frontend \
    -t "$FRONTEND_IMAGE" \
    --push \
    .

echo -e "${GREEN}✓ Frontend image published (multi-arch)${NC}"
echo ""

echo -e "${GREEN}✓ All images published successfully!${NC}"
echo ""
echo "To use these published images:"
echo "  1. Set your GitHub username:"
echo "     export GHCR_USERNAME=$GHCR_USERNAME"
echo ""
echo "  2. Load the image environment variables:"
echo "     source ./scripts/use-published-images.sh"
echo ""
echo "  3. Run docker-compose:"
echo "     docker-compose -f docker-compose.demo.yml up"
echo ""
echo "Or in one line:"
echo "  eval \$(./scripts/use-published-images.sh) && docker-compose -f docker-compose.demo.yml up"

