# POKRABS

Web application for hierarchical problem decomposition using the POKRABS framework (Problem → Objective → Key Results → Actions → Blockers → Status).

## Quick Start (Demo Mode)

The fastest way to try POKRABS is using Docker in demo mode. This will start the application with sample data pre-loaded.

### Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running
- Docker Compose (included with Docker Desktop, or install separately)

### Option 1: Quick Launch (Recommended - Uses Published Images)

The simplest way to launch the demo is using our one-command script that pulls pre-built images from the cloud:

```bash
curl -sSL https://raw.githubusercontent.com/andrew-rosca/pokrabs/main/scripts/run-demo.sh | bash
```

That's it! The script will:
- Check that Docker is running
- Download the docker-compose configuration
- Pull the latest published images from GitHub Container Registry
- Start the application with sample data

**Access the application:** Open http://localhost:3000 in your browser

**To stop:** Press `Ctrl+C` in the terminal

### Option 2: Local Build (For Development)

If you want to build the images locally or make code changes:

```bash
docker-compose -f docker-compose.demo.yml up
```

This will:
- Build the Docker images locally (first time only, takes longer)
- Run database migrations automatically
- Seed the database with sample data
- Start the server

**Access the application:** Open http://localhost:3000 in your browser

### What to Expect

- **Pre-seeded data**: The application starts with a "Default Workspace" containing sample problems demonstrating the POKRABS framework
- **Ephemeral storage**: All data is stored inside the container and will be lost when you stop and remove the container
- **Fresh start**: Each time you restart the container, you'll get a fresh database with sample data

### Managing the Container

**Stop the application:**
```bash
docker-compose down
```

**Restart the application:**
```bash
# For published images (Option 1):
curl -sSL https://raw.githubusercontent.com/andrew-rosca/pokrabs/main/scripts/run-demo.sh | bash

# For local build (Option 2):
docker-compose -f docker-compose.demo.yml up
```

**View logs:**
```bash
docker-compose logs -f
```

**Rebuild after code changes (Option 2 only):**
```bash
docker-compose -f docker-compose.demo.yml up --build
```

## Development

For local development, you'll run the frontend and backend separately with hot-reload enabled.

### Prerequisites

- Node.js 18+ installed
- npm installed

### Initial Setup

Run the initialization script:

```bash
./init.sh
```

This will:
- Install all dependencies (root, backend, frontend)
- Set up the database
- Prepare the development environment

### Running the Development Servers

**Option 1: Run both together (recommended)**

```bash
npm run dev
```

This starts both frontend and backend concurrently.

**Option 2: Run separately**

**Terminal 1 (Backend):**
```bash
cd backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (Vite dev server with hot reload)
- Backend API: http://localhost:3001

### Database Operations

**Run migrations:**
```bash
cd backend && npm run db:migrate
```

**Setup database (push schema):**
```bash
cd backend && npm run db:setup
```

**Seed database with test data:**

Small dataset (6-7 problems, good for demos):
```bash
cd backend && npm run db:seed
```

Large dataset (200+ problems, for testing scrolling/performance):
```bash
cd backend && npm run db:seed:large
```

See `backend/src/database/SEED_README.md` for details.

### Testing

Run tests:

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# All tests from root
npm test
```

## Docker Deployment Options

POKRABS supports three deployment modes via Docker:

### 1. Demo Mode

**Files:** `docker-compose.demo.yml` (local build) or `docker-compose.demo-pull.yml` (published images)

- Ephemeral data storage (data lost on container removal)
- Automatic seeding on startup
- Perfect for demonstrations and testing

**Quick start (uses published images):**
```bash
curl -sSL https://raw.githubusercontent.com/andrew-rosca/pokrabs/main/scripts/run-demo.sh | bash
```

**Local build:**
```bash
docker-compose -f docker-compose.demo.yml up
```

### 2. Light Operation Mode

**File:** `docker-compose.light.yml`

- Persistent SQLite database via volume mount
- Data survives container restarts
- Suitable for small-scale deployments

```bash
docker-compose -f docker-compose.light.yml up
```

The database will be stored in `./data` directory on your host machine.

### 3. Production Mode

**File:** `docker-compose.prod.yml`

- Connects to external database (PostgreSQL, MySQL, etc.)
- No volume mounts required
- Suitable for production deployments

**Setup:**

1. Set environment variables:
```bash
export DATABASE_TYPE=postgresql
export DATABASE_URL=postgresql://user:password@host:5432/pokrabs
```

2. Start the service:
```bash
docker-compose -f docker-compose.prod.yml up
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_TYPE` | Database type: `sqlite`, `postgresql`, `mysql` | `sqlite` |
| `DATABASE_URL` | Database connection string | `./data/pokrabs.db` |
| `PORT` | Backend API server port | `3001` |
| `NODE_ENV` | Environment mode | `production` |
| `DEMO_MODE` | Enable demo mode (auto-seeding) | `false` |

### Ports

- **Frontend (nginx):** Port 3000
- **Backend (API):** Port 3001

## Publishing Docker Images

POKRABS Docker images can be published to GitHub Container Registry (GHCR) for easy distribution and deployment.

### Prerequisites

- Docker installed and running
- GitHub account
- GitHub Personal Access Token (PAT) with `write:packages` scope

### First Time Setup

1. **Create a GitHub Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name (e.g., "Docker GHCR")
   - Select scope: `write:packages` (required to push images)
   - Optionally select `read:packages` (to pull private images)
   - Click "Generate token" and copy the token

2. **Authenticate with GHCR:**
   ```bash
   export GITHUB_TOKEN=your_token_here
   export GHCR_USERNAME=your-username
   ./scripts/docker-login-ghcr.sh
   ```
   
   Or manually:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u $GHCR_USERNAME --password-stdin
   ```

### Publishing Images

1. **Set your GitHub username:**
   ```bash
   export GHCR_USERNAME=your-username
   ```

2. **Publish the images:**
   ```bash
   ./scripts/publish-images.sh
   ```

This will build and push both images to:
- `ghcr.io/<username>/pokrabs-backend:latest`
- `ghcr.io/<username>/pokrabs-frontend:latest`

### Using Published Images

To use published images instead of building locally:

1. **Set your GitHub username:**
   ```bash
   export GHCR_USERNAME=your-username
   ```

2. **Load the image environment variables:**
   ```bash
   source ./scripts/use-published-images.sh
   ```
   
   Or in one line:
   ```bash
   eval $(./scripts/use-published-images.sh)
   ```

3. **Run docker-compose as usual:**
   ```bash
   docker-compose -f docker-compose.demo.yml up
   ```

Docker Compose will automatically use the published images if `GHCR_FRONTEND_IMAGE` and `GHCR_BACKEND_IMAGE` are set, otherwise it will build locally.

### Making Images Public

By default, images published to GHCR are private. To make them public:

1. Go to your GitHub repository or organization
2. Navigate to "Packages" in the right sidebar
3. Click on the package (e.g., `pokrabs-backend`)
4. Click "Package settings"
5. Scroll down to "Danger Zone" and click "Change visibility"
6. Select "Public"

Alternatively, you can make packages public during creation by including `--public` flag (requires additional script modification).

### Future CI/CD Integration

This setup is designed to easily integrate with GitHub Actions:

- Images can be published automatically on tags/releases
- The same image naming convention is used
- Environment variables can be set in GitHub Actions secrets
- Example workflow would use `GITHUB_TOKEN` and set `GHCR_USERNAME` to the repository owner

## Project Structure

- `backend/` - Node.js/Express API server
- `frontend/` - React frontend application
- `shared/` - Shared TypeScript types
- `docker/` - Docker configuration files
- `docs/` - Documentation and project planning

## Documentation

- `docs/specification.md` - Full project specification
- `docs/feature_list.json` - Complete feature breakdown
- `docs/implementation-progress.txt` - Implementation progress log
- `docs/coder-instructions.md` - Instructions for coding agents
- `docs/initializer-instructions.md` - Instructions for initializer agents
- `docs/KEYBOARD_SHORTCUTS.md` - Keyboard shortcuts and VIM motions

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License** (CC BY-NC 4.0).

This means:
- ✅ You can use, modify, and distribute this software
- ✅ You must give appropriate credit and link to the license
- ❌ **You may NOT use this software for commercial purposes**

For full license terms, see [LICENSE](LICENSE) file or visit: https://creativecommons.org/licenses/by-nc/4.0/
