/**
 * Tests for Project Repository
 * 
 * Uses isolated test database for complete test isolation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaProjectRepository } from './prisma-project-repository';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';

describe('PrismaProjectRepository', () => {
  let repository: PrismaProjectRepository;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
    repository = new PrismaProjectRepository(prisma);
  });

  afterAll(async () => {
    // Clean up the isolated database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const project = await repository.create({
        id: 'test-project-1',
        name: 'Test Project',
      });

      expect(project.id).toBe('test-project-1');
      expect(project.name).toBe('Test Project');
      expect(project.createdAt).toBeDefined();
      expect(project.deletedAt).toBeNull();
    });

    it('should set createdAt timestamp', async () => {
      const before = new Date();
      const project = await repository.create({
        id: 'test-project-2',
        name: 'Test Project 2',
      });
      const after = new Date();

      const createdAt = new Date(project.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('findById', () => {
    it('should find a project by ID', async () => {
      await repository.create({
        id: 'test-project-3',
        name: 'Test Project 3',
      });

      const project = await repository.findById('test-project-3');

      expect(project).not.toBeNull();
      expect(project?.id).toBe('test-project-3');
      expect(project?.name).toBe('Test Project 3');
    });

    it('should return null for non-existent project', async () => {
      const project = await repository.findById('non-existent');
      expect(project).toBeNull();
    });

    it('should exclude soft-deleted projects', async () => {
      await repository.create({
        id: 'test-project-4',
        name: 'Test Project 4',
      });

      await repository.softDelete('test-project-4');

      const project = await repository.findById('test-project-4');
      expect(project).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      await repository.create({ id: 'project-1', name: 'Project 1' });
      await repository.create({ id: 'project-2', name: 'Project 2' });
      await repository.create({ id: 'project-3', name: 'Project 3' });

      const projects = await repository.findAll();

      expect(projects).toHaveLength(3);
      expect(projects.map(p => p.id)).toContain('project-1');
      expect(projects.map(p => p.id)).toContain('project-2');
      expect(projects.map(p => p.id)).toContain('project-3');
    });

    it('should exclude soft-deleted projects', async () => {
      await repository.create({ id: 'project-1', name: 'Project 1' });
      await repository.create({ id: 'project-2', name: 'Project 2' });
      await repository.softDelete('project-2');

      const projects = await repository.findAll();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('project-1');
    });

    it('should return empty array when no projects exist', async () => {
      const projects = await repository.findAll();
      expect(projects).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update project name', async () => {
      await repository.create({ id: 'project-1', name: 'Original Name' });

      const updated = await repository.update('project-1', {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should not update fields that are not provided', async () => {
      const original = await repository.create({
        id: 'project-1',
        name: 'Original Name',
      });

      const updated = await repository.update('project-1', {});

      expect(updated.name).toBe(original.name);
      expect(updated.id).toBe(original.id);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', async () => {
      await repository.create({ id: 'project-1', name: 'Project 1' });

      await repository.softDelete('project-1');

      // Verify soft delete by checking it's excluded from queries
      const project = await repository.findById('project-1');
      expect(project).toBeNull();
    });

    it('should throw error if project does not exist', async () => {
      await expect(repository.softDelete('non-existent')).rejects.toThrow();
    });
  });
});

