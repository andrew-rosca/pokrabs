/**
 * Views API Routes
 * 
 * Handles all HTTP requests related to views.
 */

import { Router, Request, Response } from 'express';
import { getViewRepository, getWorkspaceRepository } from '../models/repository-factory';
import { ViewFilters } from '../../../shared/types';
import { PrismaClient } from '@prisma/client';
import { generateId } from '../utils/id-generator';

const router = Router();

// Input validation constants
const MAX_NAME_LENGTH = 255;
const MAX_LABELS_COUNT = 50;

// Helper to get repository with Prisma client from request if available (for testing)
const getViewRepoWithPrisma = (req: Request) => {
  return req.prisma ? getViewRepository(req.prisma) : getViewRepository();
};

const getWorkspaceRepoWithPrisma = (req: Request) => {
  return req.prisma ? getWorkspaceRepository(req.prisma) : getWorkspaceRepository();
};

/**
 * GET /api/workspaces/:workspaceId/views
 * List all views for a workspace
 */
router.get('/workspaces/:workspaceId/views', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    // Verify workspace exists
    const workspaceRepo = getWorkspaceRepoWithPrisma(req);
    const workspace = await workspaceRepo.findById(workspaceId, req.organizationId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    const viewRepo = getViewRepoWithPrisma(req);
    const views = await viewRepo.findByWorkspaceId(workspaceId, req.organizationId);
    
    res.json(views);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch views' });
  }
});

/**
 * POST /api/workspaces/:workspaceId/views
 * Create a new view
 */
router.post('/workspaces/:workspaceId/views', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, filters, isDefault } = req.body;
    
    // Verify workspace exists
    const workspaceRepo = getWorkspaceRepoWithPrisma(req);
    const workspace = await workspaceRepo.findById(workspaceId, req.organizationId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'View name is required' });
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ 
        error: `View name too long (max ${MAX_NAME_LENGTH} characters)` 
      });
    }
    
    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({ error: 'Filters are required' });
    }
    
    // Validate filters structure
    const selectedLabels = Array.isArray(filters.selectedLabels) ? filters.selectedLabels : [];
    if (selectedLabels.length > MAX_LABELS_COUNT) {
      return res.status(400).json({ 
        error: `Too many selected labels (max ${MAX_LABELS_COUNT})` 
      });
    }
    for (const label of selectedLabels) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        return res.status(400).json({ error: 'Selected labels must be non-empty strings' });
      }
      if (label.length > 100) {
        return res.status(400).json({ error: 'Label too long (max 100 characters)' });
      }
    }
    
    const viewFilters: ViewFilters = {
      selectedStatuses: Array.isArray(filters.selectedStatuses) ? filters.selectedStatuses : [],
      selectedLabels,
    };
    
    const viewRepo = getViewRepoWithPrisma(req);
    const view = await viewRepo.create({
      id: await generateId(),
      workspaceId,
      organizationId: req.organizationId,
      name: name.trim(),
      filters: viewFilters,
      isDefault: isDefault ?? false,
    });
    
    res.status(201).json(view);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create view' });
  }
});

/**
 * GET /api/views/:id
 * Get a view by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const viewRepo = getViewRepoWithPrisma(req);
    const view = await viewRepo.findById(req.params.id, req.organizationId);
    
    if (!view) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    res.json(view);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch view' });
  }
});

/**
 * PATCH /api/views/:id
 * Update a view
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, filters } = req.body;
    
    const viewRepo = getViewRepoWithPrisma(req);
    
    // Check if view exists
    const existingView = await viewRepo.findById(req.params.id, req.organizationId);
    if (!existingView) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    const updateData: { name?: string; filters?: ViewFilters } = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'View name must be a non-empty string' });
      }
      const trimmedName = name.trim();
      if (trimmedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ 
          error: `View name too long (max ${MAX_NAME_LENGTH} characters)` 
        });
      }
      updateData.name = trimmedName;
    }
    
    if (filters !== undefined) {
      if (typeof filters !== 'object') {
        return res.status(400).json({ error: 'Filters must be an object' });
      }
      const selectedLabels = Array.isArray(filters.selectedLabels) ? filters.selectedLabels : [];
      if (selectedLabels.length > MAX_LABELS_COUNT) {
        return res.status(400).json({ 
          error: `Too many selected labels (max ${MAX_LABELS_COUNT})` 
        });
      }
      for (const label of selectedLabels) {
        if (typeof label !== 'string' || label.trim().length === 0) {
          return res.status(400).json({ error: 'Selected labels must be non-empty strings' });
        }
        if (label.length > 100) {
          return res.status(400).json({ error: 'Label too long (max 100 characters)' });
        }
      }
      updateData.filters = {
        selectedStatuses: Array.isArray(filters.selectedStatuses) ? filters.selectedStatuses : [],
        selectedLabels,
      };
    }
    
    const updated = await viewRepo.update(req.params.id, req.organizationId, updateData);
    
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'View not found' });
    }
    res.status(500).json({ error: 'Failed to update view' });
  }
});

/**
 * PATCH /api/views/:id/use
 * Update lastUsedAt timestamp for a view
 */
router.patch('/:id/use', async (req: Request, res: Response) => {
  try {
    const viewRepo = getViewRepoWithPrisma(req);
    
    // Check if view exists
    const existingView = await viewRepo.findById(req.params.id, req.organizationId);
    if (!existingView) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    await viewRepo.updateLastUsedAt(req.params.id, req.organizationId);
    
    // Return updated view
    const updated = await viewRepo.findById(req.params.id, req.organizationId);
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'View not found' });
    }
    res.status(500).json({ error: 'Failed to update view' });
  }
});

/**
 * DELETE /api/views/:id
 * Soft delete a view
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const viewRepo = getViewRepoWithPrisma(req);
    
    // Check if view exists
    const existingView = await viewRepo.findById(req.params.id, req.organizationId);
    if (!existingView) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    // Don't allow deleting the default view
    if (existingView.isDefault) {
      return res.status(400).json({ error: 'Cannot delete the default view' });
    }
    
    await viewRepo.softDelete(req.params.id, req.organizationId);
    
    res.status(204).send();
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'View not found' });
    }
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

export default router;

