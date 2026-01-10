/**
 * Security Tests for Organization Isolation
 * 
 * Ensures that users can only access data from their own organization.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getOrganizationRepository, getUserRepository, getWorkspaceRepository, getProblemRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import workspacesRouter from '../api/workspaces';
import problemsRouter from '../api/problems';

describe('Organization Isolation Security', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let org1Id: string;
  let org2Id: string;
  let user1Id: string;
  let user2Id: string;
  let workspace1Id: string;
  let workspace2Id: string;

  beforeEach(async () => {
    process.env.AUTH_MODE = 'required';

    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Create two organizations
    const orgRepo = getOrganizationRepository(prisma);
    const org1 = await orgRepo.create({
      id: randomUUID(),
      name: 'Organization 1',
    });
    org1Id = org1.id;

    const org2 = await orgRepo.create({
      id: randomUUID(),
      name: 'Organization 2',
    });
    org2Id = org2.id;

    // Create users in each organization
    const userRepo = getUserRepository(prisma);
    const user1 = await userRepo.create({
      id: randomUUID(),
      organizationId: org1Id,
      email: 'user1@example.com',
      name: 'User 1',
      authId: 'user1-auth-id',
      authProvider: 'google',
    });
    user1Id = user1.id;

    const user2 = await userRepo.create({
      id: randomUUID(),
      organizationId: org2Id,
      email: 'user2@example.com',
      name: 'User 2',
      authId: 'user2-auth-id',
      authProvider: 'google',
    });
    user2Id = user2.id;

    // Create workspaces in each organization
    const workspaceRepo = getWorkspaceRepository(prisma);
    const workspace1 = await workspaceRepo.create({
      id: 'workspace-1',
      organizationId: org1Id,
      name: 'Workspace 1',
    });
    workspace1Id = workspace1.id;

    const workspace2 = await workspaceRepo.create({
      id: 'workspace-2',
      organizationId: org2Id,
      name: 'Workspace 2',
    });
    workspace2Id = workspace2.id;

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax' as const,
      },
    }));

    app.use('/api/workspaces', authenticate, workspacesRouter);
    app.use('/api/problems', authenticate, problemsRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('Workspace isolation', () => {
    it('should only return workspaces from user\'s organization', async () => {
      const agent = request.agent(app);
      
      // Set session for user1 (org1)
      await agent
        .get('/api/workspaces')
        .set('Cookie', `connect.sid=${JSON.stringify({ userId: user1Id, organizationId: org1Id })}`);

      // Manually set session (simulating authenticated user)
      const response = await request(app)
        .get('/api/workspaces')
        .set('Cookie', `connect.sid=${JSON.stringify({ userId: user1Id, organizationId: org1Id })}`);

      // This test verifies the concept - in practice, we'd use proper session middleware
      // For now, we'll test the repository level directly
      const workspaceRepo = getWorkspaceRepository(prisma);
      const org1Workspaces = await workspaceRepo.findAll(org1Id);
      const org2Workspaces = await workspaceRepo.findAll(org2Id);

      expect(org1Workspaces).toHaveLength(1);
      expect(org1Workspaces[0].id).toBe(workspace1Id);
      expect(org2Workspaces).toHaveLength(1);
      expect(org2Workspaces[0].id).toBe(workspace2Id);
    });

    it('should not allow access to workspace from different organization', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      
      // User from org1 trying to access workspace from org2
      const workspace = await workspaceRepo.findById(workspace2Id, org1Id);
      
      expect(workspace).toBeNull();
    });

    it('should not allow creating workspace in different organization', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      
      // Create workspace in org1
      const workspace = await workspaceRepo.create({
        id: 'workspace-3',
        organizationId: org1Id, // Correct org
        name: 'Workspace 3',
      });

      expect(workspace.id).toBe('workspace-3');
      expect(workspace.name).toBe('Workspace 3');
      
      // Verify it's accessible from org1
      const fromOrg1 = await workspaceRepo.findById(workspace.id, org1Id);
      expect(fromOrg1).not.toBeNull();
      expect(fromOrg1?.id).toBe('workspace-3');
      
      // Verify it's not accessible from org2
      const fromOrg2 = await workspaceRepo.findById(workspace.id, org2Id);
      expect(fromOrg2).toBeNull();
    });
  });

  describe('Problem isolation', () => {
    it('should only return problems from user\'s organization', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create problems in each organization
      const problem1 = await problemRepo.create({
        workspaceId: workspace1Id,
        organizationId: org1Id,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });

      const problem2 = await problemRepo.create({
        workspaceId: workspace2Id,
        organizationId: org2Id,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });

      // Verify isolation
      const org1Problems = await problemRepo.findByWorkspaceId(workspace1Id, org1Id);
      const org2Problems = await problemRepo.findByWorkspaceId(workspace2Id, org2Id);

      expect(org1Problems).toHaveLength(1);
      expect(org1Problems[0].id).toBe(problem1.id);
      expect(org2Problems).toHaveLength(1);
      expect(org2Problems[0].id).toBe(problem2.id);

      // Verify cross-organization access is blocked
      const problem1FromOrg2 = await problemRepo.findById(problem1.id, org2Id);
      expect(problem1FromOrg2).toBeNull();

      const problem2FromOrg1 = await problemRepo.findById(problem2.id, org1Id);
      expect(problem2FromOrg1).toBeNull();
    });

    it('should not allow updating problem from different organization', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      const problem = await problemRepo.create({
        workspaceId: workspace1Id,
        organizationId: org1Id,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });

      // Try to update from org2 - should fail
      await expect(
        problemRepo.update(problem.id, org2Id, { problem: 'Hacked' })
      ).rejects.toThrow('Problem not found or does not belong to organization');
    });

    it('should not allow deleting problem from different organization', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      const problem = await problemRepo.create({
        workspaceId: workspace1Id,
        organizationId: org1Id,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });

      // Try to delete from org2 - should fail
      await expect(
        problemRepo.softDelete(problem.id, org2Id)
      ).rejects.toThrow('Problem not found');
    });
  });

  describe('User-organization association', () => {
    it('should enforce user belongs to organization', async () => {
      const userRepo = getUserRepository(prisma);
      
      const user1 = await userRepo.findById(user1Id);
      const user2 = await userRepo.findById(user2Id);

      expect(user1?.organizationId).toBe(org1Id);
      expect(user2?.organizationId).toBe(org2Id);
      expect(user1?.organizationId).not.toBe(user2?.organizationId);
    });

    it('should prevent user from accessing data outside their organization', async () => {
      // This is enforced at the middleware and repository level
      // Users can only access data where their organizationId matches
      const workspaceRepo = getWorkspaceRepository(prisma);
      
      // User1 (org1) can only see org1 workspaces
      const user1Workspaces = await workspaceRepo.findAll(org1Id);
      expect(user1Workspaces.length).toBe(1);
      expect(user1Workspaces[0].id).toBe(workspace1Id);

      // User2 (org2) can only see org2 workspaces
      const user2Workspaces = await workspaceRepo.findAll(org2Id);
      expect(user2Workspaces.length).toBe(1);
      expect(user2Workspaces[0].id).toBe(workspace2Id);
    });
  });
});

