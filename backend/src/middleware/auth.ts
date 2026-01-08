/**
 * Authentication Middleware
 * 
 * Handles three authentication modes:
 * - demo: Always uses default user, no authentication required
 * - optional: Authentication required for write operations, optional for read operations
 * - required: Authentication required for all operations
 */

import { Request, Response, NextFunction } from 'express';
import { getOrganizationRepository, getUserRepository } from '../models/repository-factory';
import { getPrismaClient } from '../database/prisma-client';

// Extend Express Request to include user and organization info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      organizationId: string;
    }
  }
}

/**
 * Check if a request is a write operation
 */
function isWriteOperation(req: Request): boolean {
  const writeMethods = ['POST', 'PATCH', 'DELETE'];
  return writeMethods.includes(req.method);
}

/**
 * Authentication middleware
 * 
 * Attaches userId and organizationId to the request based on AUTH_MODE:
 * - demo: Always uses default user and default organization
 * - optional: Uses session user for write ops, default user for read ops
 * - required: Requires session user for all ops
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authMode = process.env.AUTH_MODE || 'demo';
  const prisma = getPrismaClient();
  const organizationRepo = getOrganizationRepository(prisma);
  const userRepo = getUserRepository(prisma);

  try {
    // Get default organization (always needed)
    const defaultOrg = await organizationRepo.findDefault();
    if (!defaultOrg) {
      console.error('❌ Default organization not found. Database may need seeding.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Demo mode: Always use default user
    if (authMode === 'demo') {
      const defaultUser = await userRepo.findByAuthId('default@pokrabs.local', 'internal');
      if (!defaultUser) {
        console.error('❌ Default user not found. Database may need seeding.');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      req.userId = defaultUser.id;
      req.organizationId = defaultOrg.id;
      return next();
    }

    // Optional or Required mode: Check for session
    const session = (req as any).session;
    const sessionUserId = session?.userId;
    const sessionOrgId = session?.organizationId;

    // If we have a valid session, use it
    if (sessionUserId && sessionOrgId) {
      // Verify user still exists and belongs to organization
      const user = await userRepo.findById(sessionUserId);
      if (user && user.organizationId === sessionOrgId && sessionOrgId === defaultOrg.id) {
        req.userId = user.id;
        req.organizationId = user.organizationId;
        return next();
      }
      // Session is invalid, clear it
      session.userId = undefined;
      session.organizationId = undefined;
    }

    // No valid session
    const isWrite = isWriteOperation(req);

    if (authMode === 'required') {
      // Required mode: All operations need authentication
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (authMode === 'optional') {
      // Optional mode: Write operations need authentication
      if (isWrite) {
        return res.status(401).json({ error: 'Authentication required for this operation' });
      }

      // Read operations can use default user
      const defaultUser = await userRepo.findByAuthId('default@pokrabs.local', 'internal');
      if (!defaultUser) {
        console.error('❌ Default user not found. Database may need seeding.');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      req.userId = defaultUser.id;
      req.organizationId = defaultOrg.id;
      return next();
    }

    // Unknown auth mode
    console.error(`❌ Unknown AUTH_MODE: ${authMode}`);
    return res.status(500).json({ error: 'Server configuration error' });
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

