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
import { randomUUID } from 'crypto';

describe('PrismaProblemRepository', () => {
  let repository: PrismaProblemRepository;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let workspaceId: string;
  let organizationId: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
    repository = new PrismaProblemRepository(prisma);

    // Reset ID counter for predictable test IDs
    await resetIdCounter();

    // Create a test organization
    organizationId = randomUUID();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Test Organization',
      },
    });

    // Create a test workspace
    workspaceId = 'test-workspace-1';
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        organizationId,
        name: 'Test Workspace',
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
        workspaceId,
        organizationId,
      });

      expect(problem.id).toMatch(/^[0-9a-z]{2,}$/);
      expect(problem.idPath).toBe(problem.id);
      expect(problem.workspaceId).toBe(workspaceId);
      expect(problem.parentId).toBeNull();
      expect(problem.status).toBe(Status.NotStarted);
      expect(problem.votes).toBe(0);
      expect(problem.priority).toBe(0);
      expect(problem.labels).toEqual([]);
    });

    it('should generate unique IDs', async () => {
      const problem1 = await repository.create({ workspaceId, organizationId });
      const problem2 = await repository.create({ workspaceId, organizationId });

      expect(problem1.id).not.toBe(problem2.id);
    });

    it('should create a child problem with correct idPath', async () => {
      const parent = await repository.create({ workspaceId, organizationId });

      const child = await repository.create({
        workspaceId,
        organizationId,
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
      expect(child.idPath).toBe(`${parent.idPath}-${child.id}`);
    });

    it('should create a grandchild problem with correct idPath', async () => {
      const parent = await repository.create({ workspaceId, organizationId });
      const child = await repository.create({
        workspaceId,
        organizationId,
        parentId: parent.id,
      });

      const grandchild = await repository.create({
        workspaceId,
        organizationId,
        parentId: child.id,
      });

      expect(grandchild.idPath).toBe(`${child.idPath}-${grandchild.id}`);
    });

    it('should accept custom fields', async () => {
      const problem = await repository.create({
        workspaceId,
        organizationId,
        status: Status.InProgress,
        labels: ['urgent', 'important'],
      });

      expect(problem.status).toBe(Status.InProgress);
      expect(problem.labels).toEqual(['urgent', 'important']);
    });
  });

  describe('findById', () => {
    it('should find a problem by ID', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const found = await repository.findById(created.id, organizationId);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.idPath).toBe(created.idPath);
    });

    it('should return null for non-existent problem', async () => {
      const problem = await repository.findById('non-existent', organizationId);
      expect(problem).toBeNull();
    });

    it('should exclude soft-deleted problems', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      await repository.softDelete(created.id, organizationId);

      const problem = await repository.findById(created.id, organizationId);
      expect(problem).toBeNull();
    });

    it('should return null for problem in different organization', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
        },
      });

      const found = await repository.findById(created.id, otherOrgId);
      expect(found).toBeNull();
    });
  });

  describe('findByWorkspaceId', () => {
    it('should find all problems in a workspace', async () => {
      await repository.create({ workspaceId, organizationId });
      await repository.create({ workspaceId, organizationId });
      await repository.create({ workspaceId, organizationId });

      const problems = await repository.findByWorkspaceId(workspaceId, organizationId);

      expect(problems).toHaveLength(3);
      problems.forEach(p => {
        expect(p.workspaceId).toBe(workspaceId);
      });
    });

    it('should exclude soft-deleted problems', async () => {
      const problem1 = await repository.create({ workspaceId, organizationId });
      const problem2 = await repository.create({ workspaceId, organizationId });
      await repository.softDelete(problem1.id, organizationId);

      const problems = await repository.findByWorkspaceId(workspaceId, organizationId);

      expect(problems).toHaveLength(1);
      expect(problems[0].id).toBe(problem2.id);
    });

    it('should return empty array when no problems exist', async () => {
      const problems = await repository.findByWorkspaceId(workspaceId, organizationId);
      expect(problems).toHaveLength(0);
    });

    it('should not find problems from different organization', async () => {
      await repository.create({ workspaceId, organizationId });

      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
        },
      });

      const problems = await repository.findByWorkspaceId(workspaceId, otherOrgId);
      expect(problems).toHaveLength(0);
    });
  });

  describe('findByParentId', () => {
    it('should find all child problems', async () => {
      const parent = await repository.create({ workspaceId, organizationId });
      await repository.create({ workspaceId, organizationId, parentId: parent.id });
      await repository.create({ workspaceId, organizationId, parentId: parent.id });

      const children = await repository.findByParentId(parent.id, organizationId);

      expect(children).toHaveLength(2);
      children.forEach(child => {
        expect(child.parentId).toBe(parent.id);
      });
    });

    it('should exclude soft-deleted problems', async () => {
      const parent = await repository.create({ workspaceId, organizationId });
      const child1 = await repository.create({ workspaceId, organizationId, parentId: parent.id });
      await repository.create({ workspaceId, organizationId, parentId: parent.id });
      await repository.softDelete(child1.id, organizationId);

      const children = await repository.findByParentId(parent.id, organizationId);

      expect(children).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update problem fields', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const updated = await repository.update(created.id, organizationId, {
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
        workspaceId,
        organizationId,
        status: Status.InProgress,
      });

      const updated = await repository.update(created.id, organizationId, {});

      expect(updated.status).toBe(Status.InProgress);
      expect(updated.id).toBe(created.id);
    });

    it('should throw error if problem does not belong to organization', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
        },
      });

      await expect(
        repository.update(created.id, otherOrgId, { status: Status.InProgress })
      ).rejects.toThrow('Problem not found or does not belong to organization');
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      await repository.softDelete(created.id, organizationId);

      const problem = await repository.findById(created.id, organizationId);
      expect(problem).toBeNull();
    });

    it('should throw error if problem does not belong to organization', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
        },
      });

      await expect(
        repository.softDelete(created.id, otherOrgId)
      ).rejects.toThrow('Problem not found');
    });
  });

  describe('checkIdExists', () => {
    it('should return true if ID exists', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const exists = await repository.checkIdExists(created.id, workspaceId, organizationId);

      expect(exists).toBe(true);
    });

    it('should return false if ID does not exist', async () => {
      const exists = await repository.checkIdExists('non-existent', workspaceId, organizationId);
      expect(exists).toBe(false);
    });

    it('should return false for soft-deleted problems', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      await repository.softDelete(created.id, organizationId);

      const exists = await repository.checkIdExists(created.id, workspaceId, organizationId);
      expect(exists).toBe(false);
    });

    it('should return false for problems in different organization', async () => {
      const created = await repository.create({ workspaceId, organizationId });

      const otherOrgId = randomUUID();
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
        },
      });

      const exists = await repository.checkIdExists(created.id, workspaceId, otherOrgId);
      expect(exists).toBe(false);
    });
  });
});

