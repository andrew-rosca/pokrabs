/**
 * Tests for database seeding functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { seedDatabase } from './seed';
import { getProjectRepository, getProblemRepository } from '../models/repository-factory';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { PrismaClient } from '@prisma/client';

describe('Database Seeding', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const testDb = await setupTestDatabase();
    prisma = testDb.prisma;
    databaseUrl = testDb.databaseUrl;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('seedDatabase', () => {
    it('should seed small dataset with sample problems', async () => {
      const projectRepo = getProjectRepository(prisma);
      const problemRepo = getProblemRepository(prisma);

      // Run small seed
      await seedDatabase({ large: false });

      // Verify project was created
      const projects = await projectRepo.findAll();
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Default Project');

      // Verify problems were created
      const problems = await problemRepo.findByProjectId(projects[0].id);
      
      // Small seed creates: 1 root + 2 children + 2 grandchildren + 1 more child + 1 grandchild = 7 total
      expect(problems.length).toBeGreaterThanOrEqual(6);
      expect(problems.length).toBeLessThanOrEqual(10);

      // Verify root problem exists
      const rootProblems = problems.filter(p => p.parentId === null);
      expect(rootProblems.length).toBeGreaterThanOrEqual(1);

      // Verify children exist
      const childProblems = problems.filter(p => p.parentId !== null);
      expect(childProblems.length).toBeGreaterThanOrEqual(5);

      // Verify problem structure
      const rootProblem = rootProblems[0];
      expect(rootProblem.idPath).toBeTruthy();
      expect(JSON.parse(rootProblem.problem).summary).toContain('overwhelmed');
    });

    it('should seed large dataset with many problems', async () => {
      const projectRepo = getProjectRepository(prisma);
      const problemRepo = getProblemRepository(prisma);

      // Run large seed
      await seedDatabase({ large: true });

      // Verify project was created
      const projects = await projectRepo.findAll();
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('Default Project');

      // Verify many problems were created
      const problems = await problemRepo.findByProjectId(projects[0].id);
      
      // Large seed creates: 50 root + 2-5 children each = 150-300 total
      expect(problems.length).toBeGreaterThanOrEqual(150);
      expect(problems.length).toBeLessThanOrEqual(300);

      // Verify we have root problems
      const rootProblems = problems.filter(p => p.parentId === null);
      expect(rootProblems.length).toBe(50);

      // Verify we have many children
      const childProblems = problems.filter(p => p.parentId !== null);
      expect(childProblems.length).toBeGreaterThanOrEqual(100);

      // Verify variety in statuses
      const statuses = new Set(problems.map(p => p.status));
      expect(statuses.size).toBeGreaterThanOrEqual(3); // Should have multiple different statuses

      // Verify variety in labels
      const allLabels = problems.flatMap(p => p.labels);
      const uniqueLabels = new Set(allLabels);
      expect(uniqueLabels.size).toBeGreaterThanOrEqual(5); // Should have varied labels

      // Verify problems have proper structure
      const sampleProblem = problems[0];
      expect(sampleProblem.idPath).toBeTruthy();
      expect(sampleProblem.problem).toBeTruthy();
      expect(sampleProblem.objective).toBeTruthy();
      
      const parsedProblem = JSON.parse(sampleProblem.problem);
      expect(parsedProblem.summary).toBeTruthy();
      expect(parsedProblem.detail).toBeTruthy();
    });

    it('should allow reseeding by clearing existing data', async () => {
      const projectRepo = getProjectRepository(prisma);
      const problemRepo = getProblemRepository(prisma);

      // Seed once
      await seedDatabase({ large: false });
      
      const firstProjects = await projectRepo.findAll();
      const firstProblems = await problemRepo.findByProjectId(firstProjects[0].id);
      const firstProblemCount = firstProblems.length;

      // Seed again
      await seedDatabase({ large: false });
      
      const secondProjects = await projectRepo.findAll();
      const secondProblems = await problemRepo.findByProjectId(secondProjects[0].id);
      
      // Should have same count (not doubled)
      expect(secondProjects.length).toBe(1);
      expect(secondProblems.length).toBe(firstProblemCount);
    });
  });
});

