/**
 * Tests for Problems API
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import problemsRouter from './problems';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getProblemRepository, getProjectRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { Status } from '../../../shared/types';
import { resetIdCounter } from '../utils/id-generator';

describe('Problems API', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let projectId: string;

  beforeEach(async () => {
    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Reset ID counter
    await resetIdCounter();

    // Create a test project
    const projectRepo = getProjectRepository(prisma);
    const project = await projectRepo.create({
      id: 'test-project-1',
      name: 'Test Project',
    });
    projectId = project.id;

    // Create Express app with routes
    app = express();
    app.use(express.json());
    // Middleware to attach Prisma client to request (for testing)
    app.use((req, res, next) => {
      (req as any).prisma = prisma;
      next();
    });
    app.use('/api/problems', problemsRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('GET /api/problems/:id', () => {
    it('should return problem by ID', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app).get(`/api/problems/${created.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.id);
      expect(response.body.problem).toBe('Test problem');
    });

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app).get('/api/problems/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });

    it('should return 404 for soft-deleted problem', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });
      await problemRepo.softDelete(created.id);

      const response = await request(app).get(`/api/problems/${created.id}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });
  });

  describe('PATCH /api/problems/:id', () => {
    it('should update problem fields', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Original problem',
        objective: 'Original objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({
          status: Status.InProgress,
          votes: 5,
          priority: 10,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(Status.InProgress);
      expect(response.body.votes).toBe(5);
      expect(response.body.priority).toBe(10);
      // Original fields should remain unchanged
      expect(response.body.problem).toBe('Original problem');
    });

    it('should update problem text field', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: JSON.stringify({ summary: 'Original problem', detail: 'Original detail' }),
        objective: 'Original objective',
      });

      const newProblem = JSON.stringify({ summary: 'Updated problem', detail: 'Updated detail' });
      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ problem: newProblem });
      
      expect(response.status).toBe(200);
      expect(response.body.problem).toBe(newProblem);
    });

    it('should update objective field', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: JSON.stringify({ summary: 'Original objective', detail: 'Original detail' }),
      });

      const newObjective = JSON.stringify({ summary: 'Updated objective', detail: 'Updated detail' });
      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ objective: newObjective });
      
      expect(response.status).toBe(200);
      expect(response.body.objective).toBe(newObjective);
    });

    it('should update keyResults field', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
        keyResults: JSON.stringify(['Result 1', 'Result 2']),
      });

      const newKeyResults = JSON.stringify(['Result 1', 'Result 2', 'Result 3']);
      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ keyResults: newKeyResults });
      
      expect(response.status).toBe(200);
      expect(response.body.keyResults).toBe(newKeyResults);
    });

    it('should update actions field', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
        actions: JSON.stringify(['Action 1']),
      });

      const newActions = JSON.stringify(['Action 1', 'Action 2']);
      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ actions: newActions });
      
      expect(response.status).toBe(200);
      expect(response.body.actions).toBe(newActions);
    });

    it('should update blockers field', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
        blockers: JSON.stringify([]),
      });

      const newBlockers = JSON.stringify(['Blocker 1', 'Blocker 2']);
      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ blockers: newBlockers });
      
      expect(response.status).toBe(200);
      expect(response.body.blockers).toBe(newBlockers);
    });

    it('should update multiple fields at once', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Original problem',
        objective: 'Original objective',
        status: Status.NotStarted,
        votes: 0,
      });

      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({
          problem: JSON.stringify({ summary: 'Updated problem', detail: 'Updated detail' }),
          objective: JSON.stringify({ summary: 'Updated objective', detail: 'Updated detail' }),
          keyResults: JSON.stringify(['KR1', 'KR2']),
          actions: JSON.stringify(['Action 1']),
          blockers: JSON.stringify(['Blocker 1']),
          status: Status.InProgress,
          votes: 10,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.problem).toContain('Updated problem');
      expect(response.body.objective).toContain('Updated objective');
      expect(response.body.keyResults).toContain('KR1');
      expect(response.body.actions).toContain('Action 1');
      expect(response.body.blockers).toContain('Blocker 1');
      expect(response.body.status).toBe(Status.InProgress);
      expect(response.body.votes).toBe(10);
    });

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app)
        .patch('/api/problems/non-existent')
        .send({ status: Status.InProgress });
      
      expect(response.status).toBe(404);
    });

    it('should reject invalid status', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ status: 'InvalidStatus' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status value');
    });

    it('should reject non-number votes', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ votes: 'not-a-number' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Votes must be a number');
    });

    it('should reject non-number priority', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${created.id}`)
        .send({ priority: 'not-a-number' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Priority must be a number');
    });
  });

  describe('DELETE /api/problems/:id', () => {
    it('should soft delete a problem', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app).delete(`/api/problems/${created.id}`);
      
      expect(response.status).toBe(204);
      
      // Verify problem is soft-deleted
      const deleted = await problemRepo.findById(created.id);
      expect(deleted).toBeNull();
    });

    it('should cascade soft delete to child problems', async () => {
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        projectId,
        problem: 'Parent problem',
        objective: 'Parent objective',
      });
      const child = await problemRepo.create({
        projectId,
        parentId: parent.id,
        problem: 'Child problem',
        objective: 'Child objective',
      });

      const response = await request(app).delete(`/api/problems/${parent.id}`);
      
      expect(response.status).toBe(204);

      const deletedParent = await problemRepo.findById(parent.id);
      const deletedChild = await problemRepo.findById(child.id);

      expect(deletedParent).toBeNull();
      expect(deletedChild).toBeNull();
    });

    it('should cascade soft delete to grandchildren when deleting an intermediate node', async () => {
      const problemRepo = getProblemRepository(prisma);
      const root = await problemRepo.create({
        projectId,
        problem: 'Root problem',
        objective: 'Root objective',
      });
      const child = await problemRepo.create({
        projectId,
        parentId: root.id,
        problem: 'Child problem',
        objective: 'Child objective',
      });
      const grandchild = await problemRepo.create({
        projectId,
        parentId: child.id,
        problem: 'Grandchild problem',
        objective: 'Grandchild objective',
      });

      const response = await request(app).delete(`/api/problems/${child.id}`);
      
      expect(response.status).toBe(204);

      const fetchedRoot = await problemRepo.findById(root.id);
      const fetchedChild = await problemRepo.findById(child.id);
      const fetchedGrandchild = await problemRepo.findById(grandchild.id);

      expect(fetchedRoot).not.toBeNull(); // root should remain
      expect(fetchedChild).toBeNull();
      expect(fetchedGrandchild).toBeNull();
    });

    it('should return 404 when fetching a deleted problem', async () => {
      const problemRepo = getProblemRepository(prisma);
      const created = await problemRepo.create({
        projectId,
        problem: 'Problem to delete',
        objective: 'Objective',
      });

      await request(app).delete(`/api/problems/${created.id}`);

      const response = await request(app).get(`/api/problems/${created.id}`);
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app).delete('/api/problems/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });
  });
});

