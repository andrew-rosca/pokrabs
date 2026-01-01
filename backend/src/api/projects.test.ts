/**
 * Tests for Projects API
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectsRouter from './projects';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getProjectRepository, getProblemRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { Status } from '../../../shared/types';
import { resetIdCounter } from '../utils/id-generator';

describe('Projects API', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeEach(async () => {
    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Reset ID counter
    await resetIdCounter();

    // Create Express app with routes
    app = express();
    app.use(express.json());
    // Middleware to attach Prisma client to request (for testing)
    app.use((req, res, next) => {
      (req as any).prisma = prisma;
      next();
    });
    app.use('/api/projects', projectsRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      const response = await request(app).get('/api/projects');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all projects', async () => {
      const repo = getProjectRepository(prisma);
      await repo.create({ id: 'project-1', name: 'Project 1' });
      await repo.create({ id: 'project-2', name: 'Project 2' });

      const response = await request(app).get('/api/projects');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((p: any) => p.id)).toContain('project-1');
      expect(response.body.map((p: any) => p.id)).toContain('project-2');
    });

    it('should exclude soft-deleted projects', async () => {
      const repo = getProjectRepository(prisma);
      await repo.create({ id: 'project-1', name: 'Project 1' });
      await repo.create({ id: 'project-2', name: 'Project 2' });
      await repo.softDelete('project-2');

      const response = await request(app).get('/api/projects');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('project-1');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by ID', async () => {
      const repo = getProjectRepository(prisma);
      await repo.create({ id: 'project-1', name: 'Test Project' });

      const response = await request(app).get('/api/projects/project-1');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('project-1');
      expect(response.body.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return 404 for soft-deleted project', async () => {
      const repo = getProjectRepository(prisma);
      await repo.create({ id: 'project-1', name: 'Test Project' });
      await repo.softDelete('project-1');

      const response = await request(app).get('/api/projects/project-1');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'New Project' });
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Project');
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject request without name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project name is required');
    });

    it('should reject request with empty name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: '   ' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Project name is required');
    });

    it('should trim project name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: '  Trimmed Project  ' });
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Trimmed Project');
    });
  });

  describe('GET /api/projects/:projectId/problems', () => {
    it('should return problems for a project', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });
      
      const problemRepo = getProblemRepository(prisma);
      await problemRepo.create({
        projectId: project.id,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      await problemRepo.create({
        projectId: project.id,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });

      const response = await request(app).get(`/api/projects/${project.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.map((p: any) => p.problem)).toContain('Problem 1');
      expect(response.body.map((p: any) => p.problem)).toContain('Problem 2');
    });

    it('should return empty array when project has no problems', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app).get(`/api/projects/${project.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/non-existent/problems');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should exclude soft-deleted problems', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });
      
      const problemRepo = getProblemRepository(prisma);
      const problem1 = await problemRepo.create({
        projectId: project.id,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      await problemRepo.create({
        projectId: project.id,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });
      await problemRepo.softDelete(problem1.id);

      const response = await request(app).get(`/api/projects/${project.id}/problems`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].problem).toBe('Problem 2');
    });
  });

  describe('POST /api/projects/:projectId/problems', () => {
    it('should create a new problem', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({
          problem: 'New problem',
          objective: 'New objective',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.problem).toBe('New problem');
      expect(response.body.objective).toBe('New objective');
      expect(response.body.status).toBe(Status.NotStarted);
      expect(response.body.votes).toBe(0);
      expect(response.body.priority).toBe(0);
    });

    it('should create a new problem with JSON stringified fields (as frontend sends)', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      // Simulate exactly what the frontend sends - including how JSON.stringify handles enums
      const requestBody = {
        problem: JSON.stringify({ summary: 'New problem', detail: 'New problem' }),
        objective: JSON.stringify({ summary: 'New objective', detail: 'New objective' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.NotStarted, // This will serialize to 'Actionable' string
        labels: [],
        parentId: null,
      };

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send(requestBody);
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.problem).toBe(JSON.stringify({ summary: 'New problem', detail: 'New problem' }));
      expect(response.body.objective).toBe(JSON.stringify({ summary: 'New objective', detail: 'New objective' }));
      expect(response.body.status).toBe(Status.NotStarted);
    });

    it('should create a new problem with null parentId (top-level)', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({
          problem: JSON.stringify({ summary: 'New problem', detail: 'New problem' }),
          objective: JSON.stringify({ summary: 'New objective', detail: 'New objective' }),
          keyResults: JSON.stringify([]),
          actions: JSON.stringify([]),
          blockers: JSON.stringify([]),
          status: Status.NotStarted,
          labels: [],
          parentId: null,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.parentId).toBeNull();
    });

    it('should reject request without problem field', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({ objective: 'Objective' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Problem field is required');
    });

    it('should reject request without objective field', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({ problem: 'Problem' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Objective field is required');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent/problems')
        .send({
          problem: 'Problem',
          objective: 'Objective',
        });
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should create problem with parent', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });
      
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        projectId: project.id,
        problem: 'Parent problem',
        objective: 'Parent objective',
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({
          problem: 'Child problem',
          objective: 'Child objective',
          parentId: parent.id,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.parentId).toBe(parent.id);
      expect(response.body.idPath).toContain(parent.id);
    });

    it('should reject invalid parentId', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({
          problem: 'Problem',
          objective: 'Objective',
          parentId: 'non-existent',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Parent problem not found or belongs to different project');
    });

    it('should reject invalid status', async () => {
      const projectRepo = getProjectRepository(prisma);
      const project = await projectRepo.create({ id: 'project-1', name: 'Project 1' });

      const response = await request(app)
        .post(`/api/projects/${project.id}/problems`)
        .send({
          problem: 'Problem',
          objective: 'Objective',
          status: 'InvalidStatus',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid status value');
    });
  });
});

