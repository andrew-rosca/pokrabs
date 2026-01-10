/**
 * Tests for Workspaces API
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import workspacesRouter from './workspaces';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getWorkspaceRepository, getProblemRepository, getViewRepository, getOrganizationRepository, getUserRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { Status } from '../../../shared/types';
import { resetIdCounter } from '../utils/id-generator';
import { randomUUID } from 'crypto';

describe('Workspaces API', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    // Set AUTH_MODE to demo for tests
    process.env.AUTH_MODE = 'demo';

    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Reset ID counter
    await resetIdCounter();

    // Create default organization
    const orgRepo = getOrganizationRepository(prisma);
    const organization = await orgRepo.create({
      id: randomUUID(),
      name: 'Default Organization',
    });
    organizationId = organization.id;

    // Create default user
    const userRepo = getUserRepository(prisma);
    const user = await userRepo.create({
      id: randomUUID(),
      organizationId: organization.id,
      email: 'default@pokrabs.local',
      name: 'Default User',
      authId: 'default@pokrabs.local',
      authProvider: 'internal',
    });
    userId = user.id;

    // Create Express app with routes
    app = express();
    app.use(express.json());
    // Middleware to attach Prisma client to request (for testing)
    app.use((req, res, next) => {
      (req as any).prisma = prisma;
      next();
    });
    // Mock authentication middleware for tests
    app.use((req, res, next) => {
      (req as any).organizationId = organizationId;
      (req as any).userId = userId;
      next();
    });
    app.use('/api/workspaces', workspacesRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('GET /api/workspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const response = await request(app).get('/api/workspaces');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all workspaces', async () => {
      const repo = getWorkspaceRepository(prisma);
      await repo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      await repo.create({ id: 'workspace-2', organizationId, name: 'Workspace 2' });

      const response = await request(app).get('/api/workspaces');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((w: any) => w.id)).toContain('workspace-1');
      expect(response.body.map((w: any) => w.id)).toContain('workspace-2');
    });

    it('should exclude soft-deleted workspaces', async () => {
      const repo = getWorkspaceRepository(prisma);
      await repo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      await repo.create({ id: 'workspace-2', organizationId, name: 'Workspace 2' });
      await repo.softDelete('workspace-2', organizationId);

      const response = await request(app).get('/api/workspaces');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('workspace-1');
    });
  });

  describe('GET /api/workspaces/:id', () => {
    it('should return workspace by ID', async () => {
      const repo = getWorkspaceRepository(prisma);
      await repo.create({ id: 'workspace-1', organizationId, name: 'Test Workspace' });

      const response = await request(app).get('/api/workspaces/workspace-1');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('workspace-1');
      expect(response.body.name).toBe('Test Workspace');
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app).get('/api/workspaces/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should return 404 for soft-deleted workspace', async () => {
      const repo = getWorkspaceRepository(prisma);
      await repo.create({ id: 'workspace-1', organizationId, name: 'Test Workspace' });
      await repo.softDelete('workspace-1', organizationId);

      const response = await request(app).get('/api/workspaces/workspace-1');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({ name: 'New Workspace' });
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Workspace');
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workspace name is required');
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({ name: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workspace name is required');
    });

    it('should trim workspace name', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({ name: '  Trimmed Workspace  ' });
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Trimmed Workspace');
    });

    it('should create default "All Problems" view when workspace is created', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({ name: 'New Workspace' });
      
      expect(response.status).toBe(201);
      const workspaceId = response.body.id;

      // Check that default view was created
      const viewRepo = getViewRepository(prisma);
      const views = await viewRepo.findByWorkspaceId(workspaceId, organizationId);
      
      expect(views).toHaveLength(1);
      expect(views[0].name).toBe('All Problems');
      expect(views[0].isDefault).toBe(true);
      expect(views[0].filters.selectedStatuses).toEqual([
        Status.NotStarted,
        Status.InProgress,
        Status.Blocked,
        Status.Resolved,
      ]);
      expect(views[0].filters.selectedLabels).toEqual([]);
    });
  });

  describe('GET /api/workspaces/:workspaceId/problems', () => {
    it('should return problems for a workspace', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      const workspace = await workspaceRepo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      
      const problemRepo = getProblemRepository(prisma);
      await problemRepo.create({
        workspaceId: workspace.id,
        organizationId,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      await problemRepo.create({
        workspaceId: workspace.id,
        organizationId,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });

      const response = await request(app).get(`/api/workspaces/${workspace.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((p: any) => p.problem)).toContain('Problem 1');
      expect(response.body.map((p: any) => p.problem)).toContain('Problem 2');
    });

    it('should return empty array when workspace has no problems', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      const workspace = await workspaceRepo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });

      const response = await request(app).get(`/api/workspaces/${workspace.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app).get('/api/workspaces/non-existent/problems');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should exclude soft-deleted problems', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      const workspace = await workspaceRepo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      
      const problemRepo = getProblemRepository(prisma);
      const problem1 = await problemRepo.create({
        workspaceId: workspace.id,
        organizationId,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      await problemRepo.create({
        workspaceId: workspace.id,
        organizationId,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });
      await problemRepo.softDelete(problem1.id, organizationId);

      const response = await request(app).get(`/api/workspaces/${workspace.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].problem).toBe('Problem 2');
    });
  });

  describe('POST /api/workspaces/:workspaceId/problems', () => {
    let workspaceId: string;

    beforeEach(async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      const workspace = await workspaceRepo.create({ id: 'workspace-1', organizationId, name: 'Test Workspace' });
      workspaceId = workspace.id;
    });

    it('should create a new problem', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Test problem', detail: 'Detail' }),
          objective: JSON.stringify({ summary: 'Test objective', detail: 'Detail' }),
          status: Status.NotStarted,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.problem).toBe(JSON.stringify({ summary: 'Test problem', detail: 'Detail' }));
      expect(response.body.objective).toBe(JSON.stringify({ summary: 'Test objective', detail: 'Detail' }));
      expect(response.body.workspaceId).toBe(workspaceId);
      expect(response.body.id).toBeDefined();
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .post('/api/workspaces/non-existent/problems')
        .send({
          problem: JSON.stringify({ summary: 'Test', detail: '' }),
          objective: JSON.stringify({ summary: 'Test', detail: '' }),
        });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should return 400 when problem field is missing', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          objective: JSON.stringify({ summary: 'Test', detail: '' }),
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Problem field is required');
    });

    it('should return 400 when objective field is missing', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Test', detail: '' }),
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Objective field is required');
    });

    it('should create a child problem with valid parentId', async () => {
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        workspaceId,
        organizationId,
        problem: 'Parent',
        objective: 'Parent objective',
      });

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Child', detail: '' }),
          objective: JSON.stringify({ summary: 'Child objective', detail: '' }),
          parentId: parent.id,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.parentId).toBe(parent.id);
      expect(response.body.idPath).toContain(parent.id);
    });

    it('should return 400 when parentId belongs to different workspace', async () => {
      const workspaceRepo = getWorkspaceRepository(prisma);
      const otherWorkspace = await workspaceRepo.create({ id: 'workspace-2', organizationId, name: 'Other Workspace' });
      
      const problemRepo = getProblemRepository(prisma);
      const otherProblem = await problemRepo.create({
        workspaceId: otherWorkspace.id,
        organizationId,
        problem: 'Other problem',
        objective: 'Other objective',
      });

      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Child', detail: '' }),
          objective: JSON.stringify({ summary: 'Child objective', detail: '' }),
          parentId: otherProblem.id,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parent problem not found or belongs to different workspace');
    });

    it('should return 400 with invalid status', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Test', detail: '' }),
          objective: JSON.stringify({ summary: 'Test', detail: '' }),
          status: 'InvalidStatus',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid status value');
    });

    it('should reject priority greater than 10000', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Test', detail: '' }),
          objective: JSON.stringify({ summary: 'Test', detail: '' }),
          priority: 10001,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Priority must be a number between 0 and 10000');
    });

    it('should accept priority up to 10000', async () => {
      const response = await request(app)
        .post(`/api/workspaces/${workspaceId}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'Test', detail: '' }),
          objective: JSON.stringify({ summary: 'Test', detail: '' }),
          priority: 10000,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.priority).toBe(10000);
    });
  });

  describe('PATCH /api/workspaces/:id', () => {
    it('should update workspace name', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Original Name' });

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}`)
        .send({ name: 'Updated Name' });
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workspace.id);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should trim workspace name when updating', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Original Name' });

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}`)
        .send({ name: '  Trimmed Name  ' });
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Trimmed Name');
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .patch('/api/workspaces/non-existent')
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should return 400 when name is empty string', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Original Name' });

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}`)
        .send({ name: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Workspace name must be a non-empty string');
    });

    it('should return 404 for soft-deleted workspace', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Original Name' });
      await repo.softDelete(workspace.id, organizationId);

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}`)
        .send({ name: 'New Name' });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });
  });

  describe('PATCH /api/workspaces/:id/use', () => {
    it('should update lastUsedAt timestamp', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Test Workspace' });
      
      // Get initial lastUsedAt
      const initial = await repo.findById(workspace.id, organizationId);
      const initialLastUsedAt = initial!.lastUsedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}/use`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workspace.id);
      
      // Verify lastUsedAt was updated
      const updated = await repo.findById(workspace.id, organizationId);
      expect(updated!.lastUsedAt).not.toBe(initialLastUsedAt);
      expect(new Date(updated!.lastUsedAt).getTime()).toBeGreaterThan(new Date(initialLastUsedAt).getTime());
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .patch('/api/workspaces/non-existent/use');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should return 404 for soft-deleted workspace', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Test Workspace' });
      await repo.softDelete(workspace.id, organizationId);

      const response = await request(app)
        .patch(`/api/workspaces/${workspace.id}/use`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    it('should soft delete a workspace', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace1 = await repo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      await repo.create({ id: 'workspace-2', organizationId, name: 'Workspace 2' });

      const response = await request(app)
        .delete(`/api/workspaces/${workspace1.id}`);
      
      expect(response.status).toBe(204);

      // Verify workspace is soft-deleted (not in findAll)
      const allWorkspaces = await repo.findAll(organizationId);
      expect(allWorkspaces).toHaveLength(1);
      expect(allWorkspaces[0].id).toBe('workspace-2');

      // Verify workspace still exists in database but is marked as deleted
      const deleted = await prisma.workspace.findUnique({ where: { id: workspace1.id } });
      expect(deleted).toBeDefined();
      expect(deleted!.deletedAt).not.toBeNull();
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await request(app)
        .delete('/api/workspaces/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    it('should prevent deleting the last workspace', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace = await repo.create({ id: 'workspace-1', organizationId, name: 'Last Workspace' });

      const response = await request(app)
        .delete(`/api/workspaces/${workspace.id}`);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete the last workspace');

      // Verify workspace still exists
      const allWorkspaces = await repo.findAll(organizationId);
      expect(allWorkspaces).toHaveLength(1);
      expect(allWorkspaces[0].id).toBe(workspace.id);
    });

    it('should allow deleting when multiple workspaces exist', async () => {
      const repo = getWorkspaceRepository(prisma);
      const workspace1 = await repo.create({ id: 'workspace-1', organizationId, name: 'Workspace 1' });
      const workspace2 = await repo.create({ id: 'workspace-2', organizationId, name: 'Workspace 2' });
      const workspace3 = await repo.create({ id: 'workspace-3', organizationId, name: 'Workspace 3' });

      const response = await request(app)
        .delete(`/api/workspaces/${workspace2.id}`);
      
      expect(response.status).toBe(204);

      // Verify workspace2 is deleted but others remain
      const allWorkspaces = await repo.findAll(organizationId);
      expect(allWorkspaces).toHaveLength(2);
      expect(allWorkspaces.map((w: any) => w.id)).toContain('workspace-1');
      expect(allWorkspaces.map((w: any) => w.id)).toContain('workspace-3');
      expect(allWorkspaces.map((w: any) => w.id)).not.toContain('workspace-2');
    });
  });
});

