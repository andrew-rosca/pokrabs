# POKRABS

Web application for hierarchical problem decomposition using the POKRABS framework (Problem → Objective → Key Results → Actions → Blockers → Status).

## Quick Start (Demo Mode)

The fastest way to try POKRABS is using Docker in demo mode. This will start the application with sample data pre-loaded.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose installed

### Launch the Application

```bash
docker-compose -f docker-compose.demo.yml up
```

That's it! The application will:
- Build the Docker image (first time only)
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
docker-compose -f docker-compose.demo.yml up
```

**View logs:**
```bash
docker-compose logs -f
```

**Rebuild after code changes:**
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

**File:** `docker-compose.demo.yml`

- Ephemeral data storage (data lost on container removal)
- Automatic seeding on startup
- Perfect for demonstrations and testing

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

## License

ISC
