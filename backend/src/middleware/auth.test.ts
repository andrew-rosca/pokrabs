/**
 * Tests for Authentication Middleware
 * 
 * Tests all three authentication modes and write operation detection.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from './auth';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getOrganizationRepository, getUserRepository } from '../models/repository-factory';
import { randomUUID } from 'crypto';

describe('Authentication Middleware', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;
  let organizationId: string;
  let defaultUserId: string;
  let originalAuthMode: string | undefined;

  beforeEach(async () => {
    // Save original AUTH_MODE
    originalAuthMode = process.env.AUTH_MODE;

    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Create default organization
    const orgRepo = getOrganizationRepository(prisma);
    const organization = await orgRepo.create({
      id: randomUUID(),
      name: 'Default Organization',
    });
    organizationId = organization.id;

    // Create default user
    const userRepo = getUserRepository(prisma);
    const defaultUser = await userRepo.create({
      id: randomUUID(),
      organizationId: organization.id,
      email: 'default@pokrabs.local',
      name: 'Default User',
      authId: 'default@pokrabs.local',
      authProvider: 'internal',
    });
    defaultUserId = defaultUser.id;
  });

  afterAll(async () => {
    // Restore original AUTH_MODE
    if (originalAuthMode !== undefined) {
      process.env.AUTH_MODE = originalAuthMode;
    } else {
      delete process.env.AUTH_MODE;
    }

    // Clean up the isolated database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  const createMockRequest = (method: string, session?: any): Partial<Request> => {
    return {
      method,
      session: session || {},
    } as Partial<Request>;
  };

  const createMockResponse = (): Partial<Response> => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockNext = (): NextFunction => {
    return vi.fn();
  };

  describe('demo mode', () => {
    beforeEach(() => {
      process.env.AUTH_MODE = 'demo';
    });

    it('should attach default user and organization for GET requests', async () => {
      const req = createMockRequest('GET') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should attach default user and organization for POST requests', async () => {
      const req = createMockRequest('POST') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should attach default user and organization for PATCH requests', async () => {
      const req = createMockRequest('PATCH') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should attach default user and organization for DELETE requests', async () => {
      const req = createMockRequest('DELETE') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optional mode', () => {
    beforeEach(() => {
      process.env.AUTH_MODE = 'optional';
    });

    it('should allow GET requests without authentication', async () => {
      const req = createMockRequest('GET') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should require authentication for POST requests', async () => {
      const req = createMockRequest('POST') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required for this operation' });
    });

    it('should require authentication for PATCH requests', async () => {
      const req = createMockRequest('PATCH') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should require authentication for DELETE requests', async () => {
      const req = createMockRequest('DELETE') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow authenticated POST requests', async () => {
      const req = createMockRequest('POST', {
        userId: defaultUserId,
        organizationId: organizationId,
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should clear invalid session and require auth for write ops', async () => {
      const session = {
        userId: 'invalid-user-id',
        organizationId: organizationId,
      };
      const req = createMockRequest('POST', session) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(session.userId).toBeUndefined();
      expect(session.organizationId).toBeUndefined();
    });
  });

  describe('required mode', () => {
    beforeEach(() => {
      process.env.AUTH_MODE = 'required';
    });

    it('should require authentication for GET requests', async () => {
      const req = createMockRequest('GET') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should require authentication for POST requests', async () => {
      const req = createMockRequest('POST') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow authenticated GET requests', async () => {
      const req = createMockRequest('GET', {
        userId: defaultUserId,
        organizationId: organizationId,
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow authenticated POST requests', async () => {
      const req = createMockRequest('POST', {
        userId: defaultUserId,
        organizationId: organizationId,
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(defaultUserId);
      expect(req.organizationId).toBe(organizationId);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 if default organization not found', async () => {
      // Delete the organization to simulate error
      await prisma.organization.delete({
        where: { id: organizationId },
      });

      process.env.AUTH_MODE = 'demo';
      const req = createMockRequest('GET') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server configuration error' });
    });

    it('should return 500 if default user not found in demo mode', async () => {
      // Delete the default user
      await prisma.user.delete({
        where: { id: defaultUserId },
      });

      process.env.AUTH_MODE = 'demo';
      const req = createMockRequest('GET') as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

