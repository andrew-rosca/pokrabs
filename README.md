# POKRABS

Web application for hierarchical problem decomposition using the POKRABS framework (Problem → Objective → Key Results → Actions → Blockers → Status).

## Getting Started

Run the initialization script:

```bash
./init.sh
```

This will:
- Install all dependencies
- Set up the database
- Prepare the development environment

## Development

Start the development servers:

**Terminal 1 (Backend):**
```bash
cd backend && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Project Structure

- `backend/` - Node.js/Express API server
- `frontend/` - React frontend application
- `shared/` - Shared TypeScript types
- `docs/` - Documentation and project planning

## Documentation

- `docs/specification.md` - Full project specification
- `docs/feature_list.json` - Complete feature breakdown
- `docs/implementation-progress.txt` - Implementation progress log
- `docs/coder-instructions.md` - Instructions for coding agents
- `docs/initializer-instructions.md` - Instructions for initializer agents

## License

ISC

