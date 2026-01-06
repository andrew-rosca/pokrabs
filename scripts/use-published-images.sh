#!/bin/bash
# Helper script to set environment variables for using published GHCR images
#
# This script sets GHCR_FRONTEND_IMAGE and GHCR_BACKEND_IMAGE based on GHCR_USERNAME.
# Source this script to set the variables in your current shell:
#   source ./scripts/use-published-images.sh
#   docker-compose -f docker-compose.demo.yml up
#
# Or run it before docker-compose:
#   eval $(./scripts/use-published-images.sh)
#   docker-compose -f docker-compose.demo.yml up

if [ -z "$GHCR_USERNAME" ]; then
    echo "Error: GHCR_USERNAME is not set" >&2
    echo "Please set it with: export GHCR_USERNAME=your-username" >&2
    exit 1
fi

export GHCR_FRONTEND_IMAGE="ghcr.io/${GHCR_USERNAME}/pokrabs-frontend:latest"
export GHCR_BACKEND_IMAGE="ghcr.io/${GHCR_USERNAME}/pokrabs-backend:latest"

echo "export GHCR_FRONTEND_IMAGE=\"${GHCR_FRONTEND_IMAGE}\""
echo "export GHCR_BACKEND_IMAGE=\"${GHCR_BACKEND_IMAGE}\""

