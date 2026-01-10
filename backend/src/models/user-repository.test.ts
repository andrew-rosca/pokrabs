/**
 * Tests for User Repository
 * 
 * Uses isolated test database for complete test isolation.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './prisma-user-repository';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { randomUUID } from 'crypto';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let organizationId: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
    repository = new PrismaUserRepository(prisma);

    // Create a test organization
    organizationId = randomUUID();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Test Organization',
      },
    });
  });

  afterAll(async () => {
    // Clean up the isolated database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('create', () => {
    it('should create a new user with random UUID', async () => {
      const user = await repository.create({
        id: randomUUID(),
        organizationId,
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(user.organizationId).toBe(organizationId);
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.authId).toBeNull();
      expect(user.authProvider).toBeNull();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should create a user with OAuth credentials', async () => {
      const user = await repository.create({
        id: randomUUID(),
        organizationId,
        authId: 'google-123',
        authProvider: 'google',
        email: 'oauth@example.com',
        name: 'OAuth User',
      });

      expect(user.authId).toBe('google-123');
      expect(user.authProvider).toBe('google');
    });

    it('should generate unique IDs', async () => {
      const user1 = await repository.create({
        id: randomUUID(),
        organizationId,
        email: 'user1@example.com',
        name: 'User 1',
      });
      const user2 = await repository.create({
        id: randomUUID(),
        organizationId,
        email: 'user2@example.com',
        name: 'User 2',
      });

      expect(user1.id).not.toBe(user2.id);
    });

    it('should persist user to database', async () => {
      const id = randomUUID();
      const created = await repository.create({
        id,
        organizationId,
        email: 'persisted@example.com',
        name: 'Persisted User',
      });

      const found = await repository.findById(id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(id);
      expect(found?.email).toBe('persisted@example.com');
    });
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const id = randomUUID();
      await repository.create({
        id,
        organizationId,
        email: 'findable@example.com',
        name: 'Findable User',
      });

      const found = await repository.findById(id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(id);
      expect(found?.email).toBe('findable@example.com');
    });

    it('should return null for non-existent user', async () => {
      const found = await repository.findById(randomUUID());
      expect(found).toBeNull();
    });
  });

  describe('findByAuthId', () => {
    it('should find a user by authId and authProvider', async () => {
      await repository.create({
        id: randomUUID(),
        organizationId,
        authId: 'google-456',
        authProvider: 'google',
        email: 'google@example.com',
        name: 'Google User',
      });

      const found = await repository.findByAuthId('google-456', 'google');
      expect(found).not.toBeNull();
      expect(found?.authId).toBe('google-456');
      expect(found?.authProvider).toBe('google');
      expect(found?.email).toBe('google@example.com');
    });

    it('should return null for non-existent authId/provider combination', async () => {
      const found = await repository.findByAuthId('nonexistent', 'google');
      expect(found).toBeNull();
    });

    it('should not find user with wrong provider', async () => {
      await repository.create({
        id: randomUUID(),
        organizationId,
        authId: 'github-789',
        authProvider: 'github',
        email: 'github@example.com',
        name: 'GitHub User',
      });

      const found = await repository.findByAuthId('github-789', 'google');
      expect(found).toBeNull();
    });
  });

  describe('findOrCreateByAuthId', () => {
    it('should find existing user by authId and provider', async () => {
      const existing = await repository.create({
        id: randomUUID(),
        organizationId,
        authId: 'google-999',
        authProvider: 'google',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      const result = await repository.findOrCreateByAuthId({
        organizationId,
        authId: 'google-999',
        authProvider: 'google',
        email: 'existing@example.com',
        name: 'Existing User',
      });

      expect(result.id).toBe(existing.id);
      expect(result.authId).toBe('google-999');
    });

    it('should create new user if not found', async () => {
      const result = await repository.findOrCreateByAuthId({
        organizationId,
        authId: 'google-new',
        authProvider: 'google',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.authId).toBe('google-new');
      expect(result.authProvider).toBe('google');
      expect(result.email).toBe('new@example.com');
      expect(result.name).toBe('New User');
    });

    it('should generate unique IDs for new users', async () => {
      const user1 = await repository.findOrCreateByAuthId({
        organizationId,
        authId: 'google-1',
        authProvider: 'google',
        email: 'user1@example.com',
        name: 'User 1',
      });
      const user2 = await repository.findOrCreateByAuthId({
        organizationId,
        authId: 'google-2',
        authProvider: 'google',
        email: 'user2@example.com',
        name: 'User 2',
      });

      expect(user1.id).not.toBe(user2.id);
    });
  });
});

