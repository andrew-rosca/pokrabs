// POKRABS Backend Entry Point
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import { runMigrations } from './database/migrate';
import { execSync } from 'child_process';
import { seedDatabase } from './database/seed';
import { getWorkspaceRepository } from './models/repository-factory';
import { getPrismaClient, getDatabaseUrl } from './database/prisma-client';
import workspacesRouter from './api/workspaces';
import problemsRouter from './api/problems';
import viewsRouter from './api/views';
import authRouter from './api/auth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: true, // Allow all origins (can be restricted in production)
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());

// Session configuration
// Only configure sessions if AUTH_MODE is not 'demo' (sessions needed for OAuth)
const authMode = process.env.AUTH_MODE || 'demo';
if (authMode !== 'demo') {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn('⚠️  SESSION_SECRET not set. Sessions will not be secure. Set SESSION_SECRET in production.');
  }

  app.use(session({
    secret: sessionSecret || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax' as const, // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  console.log('✅ Session middleware configured');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/problems', problemsRouter);
app.use('/api/views', viewsRouter);

// Error handling middleware (must come before SPA routing)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (prismaError.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// In API-only mode (separate containers), skip static file serving
// The frontend is served by nginx in a separate container
console.log('🔧 API-only mode - skipping static file serving');

// 404 handler for API-only mode
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Run database schema setup on startup
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Setting up database schema...');
      try {
        // Get the correct database URL for Prisma (must have file: protocol)
        const dbUrl = getDatabaseUrl();
        const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
        
        // Use Prisma db push to sync schema (simpler and more reliable than migrations)
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          cwd: backendDir,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl }
        });
        console.log('✅ Database schema synced');
      } catch (error: any) {
        console.error('❌ Prisma db push failed:', error.message);
        // Fallback to custom migrations
        console.log('🔄 Falling back to custom migrations...');
        runMigrations();
        console.log('✅ Custom migrations completed');
      }
    } else {
      // In development, use custom migrations
      console.log('🔄 Running database migrations...');
      runMigrations();
      console.log('✅ Migrations completed');
    }
    
    // Seed database if empty
    try {
      const prisma = getPrismaClient();
      const workspaceRepo = getWorkspaceRepository(prisma);
      const organizationRepo = await import('./models/repository-factory').then(m => m.getOrganizationRepository(prisma));
      const organization = await organizationRepo.findDefault();
      
      if (!organization) {
        console.log('🌱 No default organization found, seeding database...');
        await seedDatabase({ large: false });
        console.log('✅ Database seeded successfully');
      } else {
        // Check if database is empty (no workspaces)
        const workspaces = await workspaceRepo.findAll(organization.id);
        
        if (workspaces.length === 0) {
          console.log('🌱 Database is empty, seeding with default data...');
          await seedDatabase({ large: false });
          console.log('✅ Database seeded successfully');
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not check database for seeding:', error);
      // Continue startup even if seeding check fails
    }
    
    // Start server - bind to 0.0.0.0 to accept connections from all interfaces
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 POKRABS backend server running on http://0.0.0.0:${PORT}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`📦 Serving frontend from static files`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
