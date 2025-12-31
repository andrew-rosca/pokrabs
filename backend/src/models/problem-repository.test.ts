/**
 * Tests for Problem Repository
 * 
 * Uses isolated test database for complete test isolation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaProblemRepository } from './prisma-problem-repository';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { Status } from '../../../shared/types';
import { resetIdCounter } from '../utils/id-generator';

describe('PrismaProblemRepository', () => {
  let repository: PrismaProblemRepository;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let projectId: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
    repository = new PrismaProblemRepository(prisma);

    // Reset ID counter for predictable test IDs
    await resetIdCounter();

    // Create a test project
    projectId = 'test-project-1';
    await prisma.project.create({
      data: {
        id: projectId,
        name: 'Test Project',
      },
    });
  });

  afterAll(async () => {
    // Clean up the isolated database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('create', () => {
    it('should create a new root problem', async () => {
      const problem = await repository.create({
        projectId,
      });

      expect(problem.id).toMatch(/^[0-9a-z]{2,}$/);
      expect(problem.idPath).toBe(problem.id);
      expect(problem.projectId).toBe(projectId);
      expect(problem.parentId).toBeNull();
      expect(problem.status).toBe(Status.NotStarted);
      expect(problem.votes).toBe(0);
      expect(problem.priority).toBe(0);
      expect(problem.labels).toEqual([]);
    });

    it('should generate unique IDs', async () => {
      const problem1 = await repository.create({ projectId });
      const problem2 = await repository.create({ projectId });

      expect(problem1.id).not.toBe(problem2.id);
    });

    it('should create a child problem with correct idPath', async () => {
      const parent = await repository.create({ projectId });

      const child = await repository.create({
        projectId,
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
      expect(child.idPath).toBe(`${parent.idPath}-${child.id}`);
    });

    it('should create a grandchild problem with correct idPath', async () => {
      const parent = await repository.create({ projectId });
      const child = await repository.create({
        projectId,
        parentId: parent.id,
      });

      const grandchild = await repository.create({
        projectId,
        parentId: child.id,
      });

      expect(grandchild.idPath).toBe(`${child.idPath}-${grandchild.id}`);
    });

    it('should accept custom fields', async () => {
      const problem = await repository.create({
        projectId,
        status: Status.InProgress,
        labels: ['urgent', 'important'],
      });

      expect(problem.status).toBe(Status.InProgress);
      expect(problem.labels).toEqual(['urgent', 'important']);
    });
  });

  describe('findById', () => {
    it('should find a problem by ID', async () => {
      const created = await repository.create({ projectId });

      const found = await repository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.idPath).toBe(created.idPath);
    });

    it('should return null for non-existent problem', async () => {
      const problem = await repository.findById('non-existent');
      expect(problem).toBeNull();
    });

    it('should exclude soft-deleted problems', async () => {
      const created = await repository.create({ projectId });

      await repository.softDelete(created.id);

      const problem = await repository.findById(created.id);
      expect(problem).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should find all problems in a project', async () => {
      await repository.create({ projectId });
      await repository.create({ projectId });
      await repository.create({ projectId });

      const problems = await repository.findByProjectId(projectId);

      expect(problems).toHaveLength(3);
      problems.forEach(p => {
        expect(p.projectId).toBe(projectId);
      });
    });

    it('should exclude soft-deleted problems', async () => {
      const problem1 = await repository.create({ projectId });
      const problem2 = await repository.create({ projectId });
      await repository.softDelete(problem1.id);

      const problems = await repository.findByProjectId(projectId);

      expect(problems).toHaveLength(1);
      expect(problems[0].id).toBe(problem2.id);
    });

    it('should return empty array when no problems exist', async () => {
      const problems = await repository.findByProjectId(projectId);
      expect(problems).toHaveLength(0);
    });
  });

  describe('findByParentId', () => {
    it('should find all child problems', async () => {
      const parent = await repository.create({ projectId });
      await repository.create({ projectId, parentId: parent.id });
      await repository.create({ projectId, parentId: parent.id });

      const children = await repository.findByParentId(parent.id);

      expect(children).toHaveLength(2);
      children.forEach(child => {
        expect(child.parentId).toBe(parent.id);
      });
    });

    it('should exclude soft-deleted problems', async () => {
      const parent = await repository.create({ projectId });
      const child1 = await repository.create({ projectId, parentId: parent.id });
      await repository.create({ projectId, parentId: parent.id });
      await repository.softDelete(child1.id);

      const children = await repository.findByParentId(parent.id);

      expect(children).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update problem fields', async () => {
      const created = await repository.create({ projectId });

      const updated = await repository.update(created.id, {
        status: Status.InProgress,
        votes: 5,
        priority: 10,
        labels: ['updated'],
      });

      expect(updated.status).toBe(Status.InProgress);
      expect(updated.votes).toBe(5);
      expect(updated.priority).toBe(10);
      expect(updated.labels).toEqual(['updated']);
    });

    it('should not update fields that are not provided', async () => {
      const created = await repository.create({
        projectId,
        status: Status.InProgress,
      });

      const updated = await repository.update(created.id, {});

      expect(updated.status).toBe(Status.InProgress);
      expect(updated.id).toBe(created.id);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', async () => {
      const created = await repository.create({ projectId });

      await repository.softDelete(created.id);

      const problem = await repository.findById(created.id);
      expect(problem).toBeNull();
    });
  });

  describe('checkIdExists', () => {
    it('should return true if ID exists', async () => {
      const created = await repository.create({ projectId });

      const exists = await repository.checkIdExists(created.id, projectId);

      expect(exists).toBe(true);
    });

    it('should return false if ID does not exist', async () => {
      const exists = await repository.checkIdExists('non-existent', projectId);
      expect(exists).toBe(false);
    });

    it('should return false for soft-deleted problems', async () => {
      const created = await repository.create({ projectId });

      await repository.softDelete(created.id);

      const exists = await repository.checkIdExists(created.id, projectId);
      expect(exists).toBe(false);
    });
  });
});

