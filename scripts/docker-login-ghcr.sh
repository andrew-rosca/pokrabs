#!/bin/bash
# Authenticate Docker with GitHub Container Registry (GHCR)
#
# This script helps you log in to GHCR using a GitHub Personal Access Token (PAT).
# You can create a PAT at: https://github.com/settings/tokens
# The token needs the 'write:packages' scope to push images.
#
# Usage:
#   ./scripts/docker-login-ghcr.sh
#
# Or manually:
#   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GitHub Container Registry (GHCR) Authentication${NC}"
echo ""

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}GITHUB_TOKEN environment variable is not set.${NC}"
    echo ""
    echo "To authenticate, you need a GitHub Personal Access Token (PAT)."
    echo ""
    echo "1. Create a PAT at: https://github.com/settings/tokens"
    echo "   - Click 'Generate new token' -> 'Generate new token (classic)'"
    echo "   - Give it a name (e.g., 'Docker GHCR')"
    echo "   - Select scope: 'write:packages' (to push images)"
    echo "   - Optionally select 'read:packages' (to pull private images)"
    echo "   - Click 'Generate token'"
    echo ""
    echo "2. Set the token as an environment variable:"
    echo "   export GITHUB_TOKEN=your_token_here"
    echo ""
    echo "3. Run this script again, or manually login:"
    echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin"
    echo ""
    
    # Ask if user wants to proceed manually
    read -p "Do you want to login manually now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub username: " GITHUB_USERNAME
        read -sp "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
        echo
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Successfully authenticated with GHCR${NC}"
        else
            echo -e "${RED}✗ Authentication failed${NC}"
            exit 1
        fi
    else
        exit 1
    fi
else
    # GITHUB_TOKEN is set, but we still need username
    if [ -z "$GHCR_USERNAME" ]; then
        read -p "Enter your GitHub username: " GITHUB_USERNAME
    else
        GITHUB_USERNAME="$GHCR_USERNAME"
        echo "Using GitHub username from GHCR_USERNAME: $GITHUB_USERNAME"
    fi
    
    echo -e "${YELLOW}Authenticating with GHCR...${NC}"
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully authenticated with GHCR${NC}"
    else
        echo -e "${RED}✗ Authentication failed${NC}"
        echo "Please check your token and username."
        exit 1
    fi
fi

