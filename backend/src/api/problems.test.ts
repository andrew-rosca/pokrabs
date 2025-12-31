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

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app).delete('/api/problems/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });
  });
});

