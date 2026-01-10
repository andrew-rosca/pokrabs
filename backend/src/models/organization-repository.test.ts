/**
 * Tests for Organization Repository
 * 
 * Uses isolated test database for complete test isolation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaOrganizationRepository } from './prisma-organization-repository';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { randomUUID } from 'crypto';

describe('PrismaOrganizationRepository', () => {
  let repository: PrismaOrganizationRepository;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
    repository = new PrismaOrganizationRepository(prisma);
  });

  afterAll(async () => {
    // Clean up the isolated database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('create', () => {
    it('should create a new organization with random UUID', async () => {
      const organization = await repository.create({
        id: randomUUID(),
        name: 'Test Organization',
      });

      expect(organization.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(organization.name).toBe('Test Organization');
      expect(organization.createdAt).toBeDefined();
      expect(organization.updatedAt).toBeDefined();
    });

    it('should generate unique IDs', async () => {
      const org1 = await repository.create({
        id: randomUUID(),
        name: 'Organization 1',
      });
      const org2 = await repository.create({
        id: randomUUID(),
        name: 'Organization 2',
      });

      expect(org1.id).not.toBe(org2.id);
    });

    it('should persist organization to database', async () => {
      const id = randomUUID();
      const created = await repository.create({
        id,
        name: 'Persisted Organization',
      });

      const found = await repository.findById(id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(id);
      expect(found?.name).toBe('Persisted Organization');
    });
  });

  describe('findById', () => {
    it('should find an organization by ID', async () => {
      const id = randomUUID();
      await repository.create({
        id,
        name: 'Findable Organization',
      });

      const found = await repository.findById(id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(id);
      expect(found?.name).toBe('Findable Organization');
    });

    it('should return null for non-existent organization', async () => {
      const found = await repository.findById(randomUUID());
      expect(found).toBeNull();
    });
  });

  describe('findDefault', () => {
    it('should find default organization by name', async () => {
      const defaultId = randomUUID();
      await repository.create({
        id: defaultId,
        name: 'Default Organization',
      });

      // Create another organization to ensure we're finding the right one
      await repository.create({
        id: randomUUID(),
        name: 'Other Organization',
      });

      const found = await repository.findDefault();
      expect(found).not.toBeNull();
      expect(found?.id).toBe(defaultId);
      expect(found?.name).toBe('Default Organization');
    });

    it('should return null if default organization does not exist', async () => {
      await repository.create({
        id: randomUUID(),
        name: 'Other Organization',
      });

      const found = await repository.findDefault();
      expect(found).toBeNull();
    });

    it('should return null when no organizations exist', async () => {
      const found = await repository.findDefault();
      expect(found).toBeNull();
    });
  });
});

