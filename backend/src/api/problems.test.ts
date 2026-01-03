/**
 * Tests for Problems API
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import problemsRouter from './problems';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getProblemRepository, getWorkspaceRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { Status } from '../../../shared/types';
import { resetIdCounter } from '../utils/id-generator';

describe('Problems API', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Reset ID counter
    await resetIdCounter();

    // Create a test workspace
    const workspaceRepo = getWorkspaceRepository(prisma);
    const workspace = await workspaceRepo.create({
      id: 'test-workspace-1',
      name: 'Test Workspace',
    });
    workspaceId = workspace.id;

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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
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
        workspaceId,
        problem: 'Parent problem',
        objective: 'Parent objective',
      });
      const child = await problemRepo.create({
        workspaceId,
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
        workspaceId,
        problem: 'Root problem',
        objective: 'Root objective',
      });
      const child = await problemRepo.create({
        workspaceId,
        parentId: root.id,
        problem: 'Child problem',
        objective: 'Child objective',
      });
      const grandchild = await problemRepo.create({
        workspaceId,
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
        workspaceId,
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

  describe('PATCH /api/problems/:id/move', () => {
    it('should move a root problem to become a child of another', async () => {
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        workspaceId,
        problem: 'Parent problem',
        objective: 'Parent objective',
      });
      const sibling = await problemRepo.create({
        workspaceId,
        problem: 'Sibling problem',
        objective: 'Sibling objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${sibling.id}/move`)
        .send({ newParentId: parent.id, afterProblemId: null });

      expect(response.status).toBe(200);
      expect(response.body.parentId).toBe(parent.id);
      expect(response.body.idPath).toBe(`${parent.idPath}-${sibling.id}`);
    });

    it('should move a child problem to root level', async () => {
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        workspaceId,
        problem: 'Parent problem',
        objective: 'Parent objective',
      });
      const child = await problemRepo.create({
        workspaceId,
        parentId: parent.id,
        problem: 'Child problem',
        objective: 'Child objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${child.id}/move`)
        .send({ newParentId: null, afterProblemId: null });

      expect(response.status).toBe(200);
      expect(response.body.parentId).toBeNull();
      expect(response.body.idPath).toBe(child.id);
    });

    it('should update idPaths of all descendants when moving a parent', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create a hierarchy: root -> child -> grandchild
      const root = await problemRepo.create({
        workspaceId,
        problem: 'Root',
        objective: 'Root objective',
      });
      const child = await problemRepo.create({
        workspaceId,
        parentId: root.id,
        problem: 'Child',
        objective: 'Child objective',
      });
      const grandchild = await problemRepo.create({
        workspaceId,
        parentId: child.id,
        problem: 'Grandchild',
        objective: 'Grandchild objective',
      });
      
      // Create another root to move under
      const newParent = await problemRepo.create({
        workspaceId,
        problem: 'New Parent',
        objective: 'New Parent objective',
      });

      // Move the root (with its descendants) under newParent
      const response = await request(app)
        .patch(`/api/problems/${root.id}/move`)
        .send({ newParentId: newParent.id, afterProblemId: null });

      expect(response.status).toBe(200);
      expect(response.body.idPath).toBe(`${newParent.id}-${root.id}`);

      // Verify descendants have updated idPaths
      const updatedChild = await problemRepo.findById(child.id);
      const updatedGrandchild = await problemRepo.findById(grandchild.id);

      expect(updatedChild!.idPath).toBe(`${newParent.id}-${root.id}-${child.id}`);
      expect(updatedGrandchild!.idPath).toBe(`${newParent.id}-${root.id}-${child.id}-${grandchild.id}`);
    });

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app)
        .patch('/api/problems/non-existent/move')
        .send({ newParentId: null, afterProblemId: null });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });

    it('should return 404 for non-existent new parent', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/move`)
        .send({ newParentId: 'non-existent', afterProblemId: null });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('New parent not found');
    });

    it('should reject moving a problem under itself', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/move`)
        .send({ newParentId: problem.id, afterProblemId: null });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot move');
    });

    it('should reject moving a problem under its own descendant', async () => {
      const problemRepo = getProblemRepository(prisma);
      const parent = await problemRepo.create({
        workspaceId,
        problem: 'Parent',
        objective: 'Parent objective',
      });
      const child = await problemRepo.create({
        workspaceId,
        parentId: parent.id,
        problem: 'Child',
        objective: 'Child objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${parent.id}/move`)
        .send({ newParentId: child.id, afterProblemId: null });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot move');
    });
  });

  describe('PATCH /api/problems/:id/reorder', () => {
    it('should reorder a problem to the top', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create three problems at root level
      const problem1 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      const problem2 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });
      const problem3 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 3',
        objective: 'Objective 3',
      });

      // Move problem3 to top
      const response = await request(app)
        .patch(`/api/problems/${problem3.id}/reorder`)
        .send({ position: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(problem3.id);

      // Verify order by fetching all problems and checking priorities
      const allProblems = await problemRepo.findByWorkspaceId(workspaceId);
      const sortedProblems = allProblems
        .filter(p => p.parentId === null)
        .sort((a, b) => a.priority - b.priority);

      expect(sortedProblems[0].id).toBe(problem3.id);
      expect(sortedProblems[1].id).toBe(problem1.id);
      expect(sortedProblems[2].id).toBe(problem2.id);
    });

    it('should reorder a problem to the bottom', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create three problems at root level
      const problem1 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      const problem2 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });
      const problem3 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 3',
        objective: 'Objective 3',
      });

      // Move problem1 to bottom
      const response = await request(app)
        .patch(`/api/problems/${problem1.id}/reorder`)
        .send({ position: 'bottom' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(problem1.id);

      // Verify order by fetching all problems and checking priorities
      const allProblems = await problemRepo.findByWorkspaceId(workspaceId);
      const sortedProblems = allProblems
        .filter(p => p.parentId === null)
        .sort((a, b) => a.priority - b.priority);

      expect(sortedProblems[0].id).toBe(problem2.id);
      expect(sortedProblems[1].id).toBe(problem3.id);
      expect(sortedProblems[2].id).toBe(problem1.id);
    });

    it('should reorder a problem to a specific position', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create five problems at root level
      const problem1 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 1',
        objective: 'Objective 1',
      });
      const problem2 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 2',
        objective: 'Objective 2',
      });
      const problem3 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 3',
        objective: 'Objective 3',
      });
      const problem4 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 4',
        objective: 'Objective 4',
      });
      const problem5 = await problemRepo.create({
        workspaceId,
        problem: 'Problem 5',
        objective: 'Objective 5',
      });

      // Move problem5 to position 2 (middle)
      const response = await request(app)
        .patch(`/api/problems/${problem5.id}/reorder`)
        .send({ position: 2 });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(problem5.id);

      // Verify order
      const allProblems = await problemRepo.findByWorkspaceId(workspaceId);
      const sortedProblems = allProblems
        .filter(p => p.parentId === null)
        .sort((a, b) => a.priority - b.priority);

      expect(sortedProblems[0].id).toBe(problem1.id);
      expect(sortedProblems[1].id).toBe(problem5.id);
      expect(sortedProblems[2].id).toBe(problem2.id);
      expect(sortedProblems[3].id).toBe(problem3.id);
      expect(sortedProblems[4].id).toBe(problem4.id);
    });

    it('should handle reordering within child problems', async () => {
      const problemRepo = getProblemRepository(prisma);
      
      // Create a parent with three children
      const parent = await problemRepo.create({
        workspaceId,
        problem: 'Parent',
        objective: 'Parent objective',
      });
      const child1 = await problemRepo.create({
        workspaceId,
        parentId: parent.id,
        problem: 'Child 1',
        objective: 'Objective 1',
      });
      const child2 = await problemRepo.create({
        workspaceId,
        parentId: parent.id,
        problem: 'Child 2',
        objective: 'Objective 2',
      });
      const child3 = await problemRepo.create({
        workspaceId,
        parentId: parent.id,
        problem: 'Child 3',
        objective: 'Objective 3',
      });

      // Move child3 to top among siblings
      const response = await request(app)
        .patch(`/api/problems/${child3.id}/reorder`)
        .send({ position: 'top' });

      expect(response.status).toBe(200);

      // Verify order among children
      const allProblems = await problemRepo.findByWorkspaceId(workspaceId);
      const children = allProblems
        .filter(p => p.parentId === parent.id)
        .sort((a, b) => a.priority - b.priority);

      expect(children[0].id).toBe(child3.id);
      expect(children[1].id).toBe(child1.id);
      expect(children[2].id).toBe(child2.id);
    });

    it('should return 404 for non-existent problem', async () => {
      const response = await request(app)
        .patch('/api/problems/non-existent/reorder')
        .send({ position: 'top' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Problem not found');
    });

    it('should return 400 for missing position', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/reorder`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('position is required');
    });

    it('should return 400 for invalid position type', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/reorder`)
        .send({ position: 'middle' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be "top", "bottom", or a number');
    });

    it('should return 400 for invalid position number (zero)', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/reorder`)
        .send({ position: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive integer');
    });

    it('should return 400 for invalid position number (negative)', async () => {
      const problemRepo = getProblemRepository(prisma);
      const problem = await problemRepo.create({
        workspaceId,
        problem: 'Test problem',
        objective: 'Test objective',
      });

      const response = await request(app)
        .patch(`/api/problems/${problem.id}/reorder`)
        .send({ position: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive integer');
    });
  });
});

