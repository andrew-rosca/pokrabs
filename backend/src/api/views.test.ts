/**
 * Tests for Views API
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import viewsRouter from './views';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { getWorkspaceRepository, getViewRepository, getOrganizationRepository, getUserRepository } from '../models/repository-factory';
import { PrismaClient } from '@prisma/client';
import { resetIdCounter } from '../utils/id-generator';
import { randomUUID } from 'crypto';

describe('Views API', () => {
  let app: express.Application;
  let prisma: PrismaClient;
  let databaseUrl: string;
  let organizationId: string;
  let userId: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Set AUTH_MODE to demo for tests
    process.env.AUTH_MODE = 'demo';

    // Create isolated database
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;

    // Reset ID counter
    await resetIdCounter();

    // Create default organization
    const orgRepo = getOrganizationRepository(prisma);
    const organization = await orgRepo.create({
      id: randomUUID(),
      name: 'Default Organization',
    });
    organizationId = organization.id;

    // Create default user
    const userRepo = getUserRepository(prisma);
    const user = await userRepo.create({
      id: randomUUID(),
      organizationId: organization.id,
      email: 'default@pokrabs.local',
      name: 'Default User',
      authId: 'default@pokrabs.local',
      authProvider: 'internal',
    });
    userId = user.id;

    // Create default workspace
    const workspaceRepo = getWorkspaceRepository(prisma);
    const workspace = await workspaceRepo.create({
      id: 'workspace-1',
      organizationId,
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
    // Mock authentication middleware for tests
    app.use((req, res, next) => {
      (req as any).organizationId = organizationId;
      (req as any).userId = userId;
      next();
    });
    app.use('/api/views', viewsRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  describe('POST /api/views/workspaces/:workspaceId/views', () => {
    it('should create view with vote filter options', async () => {
      const response = await request(app)
        .post(`/api/views/workspaces/${workspaceId}/views`)
        .send({
          name: 'My View',
          filters: {
            selectedStatuses: ['Actionable', 'In Progress'],
            selectedLabels: ['urgent'],
            filterByMyVotes: true,
            sortBy: 'votes',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('My View');
      expect(response.body.filters.selectedStatuses).toEqual(['Actionable', 'In Progress']);
      expect(response.body.filters.selectedLabels).toEqual(['urgent']);
      expect(response.body.filters.filterByMyVotes).toBe(true);
      expect(response.body.filters.sortBy).toBe('votes');
    });

    it('should create view with priority sort option', async () => {
      const response = await request(app)
        .post(`/api/views/workspaces/${workspaceId}/views`)
        .send({
          name: 'Priority View',
          filters: {
            selectedStatuses: ['Actionable'],
            selectedLabels: [],
            sortBy: 'priority',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.filters.sortBy).toBe('priority');
      expect(response.body.filters.filterByMyVotes).toBeUndefined();
    });

    it('should create view without vote filter options (backward compatibility)', async () => {
      const response = await request(app)
        .post(`/api/views/workspaces/${workspaceId}/views`)
        .send({
          name: 'Old View',
          filters: {
            selectedStatuses: ['Actionable'],
            selectedLabels: [],
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.filters.filterByMyVotes).toBeUndefined();
      expect(response.body.filters.sortBy).toBeUndefined();
    });
  });

  describe('PATCH /api/views/:id', () => {
    it('should update view with vote filter options', async () => {
      // Create a view first
      const viewRepo = getViewRepository(prisma);
      const view = await viewRepo.create({
        id: 'view-1',
        workspaceId,
        organizationId,
        name: 'Original View',
        filters: {
          selectedStatuses: ['Actionable'],
          selectedLabels: [],
        },
        isDefault: false,
      });

      const response = await request(app)
        .patch(`/api/views/${view.id}`)
        .send({
          filters: {
            selectedStatuses: ['Actionable'],
            selectedLabels: [],
            filterByMyVotes: true,
            sortBy: 'votes',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.filters.filterByMyVotes).toBe(true);
      expect(response.body.filters.sortBy).toBe('votes');
    });

    it('should update view to remove vote filter options', async () => {
      // Create a view with vote filters
      const viewRepo = getViewRepository(prisma);
      const view = await viewRepo.create({
        id: 'view-2',
        workspaceId,
        organizationId,
        name: 'View With Filters',
        filters: {
          selectedStatuses: ['Actionable'],
          selectedLabels: [],
          filterByMyVotes: true,
          sortBy: 'votes',
        },
        isDefault: false,
      });

      const response = await request(app)
        .patch(`/api/views/${view.id}`)
        .send({
          filters: {
            selectedStatuses: ['Actionable'],
            selectedLabels: [],
            // filterByMyVotes and sortBy not provided, should be undefined
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.filters.filterByMyVotes).toBeUndefined();
      expect(response.body.filters.sortBy).toBeUndefined();
    });

    it('should reject invalid sortBy value', async () => {
      const viewRepo = getViewRepository(prisma);
      const view = await viewRepo.create({
        id: 'view-3',
        workspaceId,
        organizationId,
        name: 'Test View',
        filters: {
          selectedStatuses: ['Actionable'],
          selectedLabels: [],
        },
        isDefault: false,
      });

      const response = await request(app)
        .patch(`/api/views/${view.id}`)
        .send({
          filters: {
            selectedStatuses: ['Actionable'],
            selectedLabels: [],
            sortBy: 'invalid',
          },
        });

      expect(response.status).toBe(200);
      // Invalid sortBy should be ignored (treated as undefined)
      expect(response.body.filters.sortBy).toBeUndefined();
    });
  });

  describe('GET /api/views/:id', () => {
    it('should return view with vote filter options', async () => {
      const viewRepo = getViewRepository(prisma);
      const view = await viewRepo.create({
        id: 'view-4',
        workspaceId,
        organizationId,
        name: 'Filtered View',
        filters: {
          selectedStatuses: ['Actionable'],
          selectedLabels: ['urgent'],
          filterByMyVotes: true,
          sortBy: 'priority',
        },
        isDefault: false,
      });

      const response = await request(app)
        .get(`/api/views/${view.id}`);

      expect(response.status).toBe(200);
      expect(response.body.filters.filterByMyVotes).toBe(true);
      expect(response.body.filters.sortBy).toBe('priority');
    });
  });
});
