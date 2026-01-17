// POKRABS Backend Entry Point
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { execSync } from 'child_process';
import { seedDatabase } from './database/seed';
import { getWorkspaceRepository } from './models/repository-factory';
import { getPrismaClient, getDatabaseUrl } from './database/prisma-client';
import workspacesRouter from './api/workspaces';
import problemsRouter from './api/problems';
import viewsRouter from './api/views';
import authRouter from './api/auth';
import { authenticate } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // stricter limit for auth endpoints (5 attempts per 15 minutes)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration - restrict in production
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'production') {
      // In production, restrict to allowed origins
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (allowedOrigins.length === 0) {
        console.error('❌ ALLOWED_ORIGINS not set in production. This is a security risk.');
        console.error('   Set ALLOWED_ORIGINS environment variable with comma-separated list of allowed origins.');
        // In production without ALLOWED_ORIGINS, fail secure by rejecting all
        return callback(new Error('CORS policy: origin not allowed'));
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('CORS policy: origin not allowed'));
      }
    } else {
      // In development, allow all origins
      return callback(null, true);
    }
  },
  credentials: true, // Allow cookies to be sent
};

app.use(cors(corsOptions));
app.use(express.json());

// Session configuration
// Only configure sessions if AUTH_MODE is not 'demo' (sessions needed for OAuth)
const authMode = process.env.AUTH_MODE || 'demo';
if (authMode !== 'demo') {
  const sessionSecret = process.env.SESSION_SECRET;
  
  // Require SESSION_SECRET in production
  if (!sessionSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ SESSION_SECRET is required in production. Server cannot start without a secure session secret.');
      console.error('   Set SESSION_SECRET environment variable to a strong random string (32+ characters).');
      process.exit(1);
    }
    console.warn('⚠️  SESSION_SECRET not set. Using insecure default for development only.');
    console.warn('   Set SESSION_SECRET in production for secure sessions.');
  }

  app.use(session({
    secret: sessionSecret || 'default-secret-change-in-production-dev-only',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax' as const, // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // In development, set domain to 'localhost' (without port) so cookies work across ports
      // In production, don't set domain (let browser use default)
      ...(process.env.NODE_ENV !== 'production' && { domain: 'localhost' }),
    },
  }));

  console.log('✅ Session middleware configured');
}

// Health check endpoint (excluded from rate limiting)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with rate limiting
// Auth routes get stricter rate limiting
app.use('/api/auth', authLimiter, authRouter);
// Other API routes get standard rate limiting
app.use('/api/workspaces', apiLimiter, authenticate, workspacesRouter);
app.use('/api/problems', apiLimiter, authenticate, problemsRouter);
app.use('/api/views', apiLimiter, authenticate, viewsRouter);

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
    // Run Prisma migrations on startup (works for both dev and prod)
    console.log('🔄 Running database migrations...');
    try {
      // Get the correct database URL for Prisma (must have file: protocol)
      const dbUrl = getDatabaseUrl();
      const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
      
      // Use Prisma migrate deploy - applies pending migrations safely
      // This works in both dev and prod, and is idempotent (safe to run multiple times)
      execSync('npx prisma migrate deploy', {
        cwd: backendDir,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log('✅ Migrations completed');
    } catch (error: any) {
      // If migrations fail, try db push as fallback (for development/testing)
      console.warn('⚠️  Prisma migrate deploy failed, trying db push as fallback...');
      try {
        const dbUrl = getDatabaseUrl();
        const backendDir = process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'backend');
        
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          cwd: backendDir,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl }
        });
        console.log('✅ Database schema synced (using db push)');
      } catch (fallbackError: any) {
        console.error('❌ Database setup failed:', fallbackError.message);
        // Don't throw - allow server to start even if migrations fail
        // This allows for manual intervention
        console.error('⚠️  Server will start, but database may be in an inconsistent state');
      }
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
