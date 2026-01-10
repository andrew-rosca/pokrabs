/**
 * Workspaces API Routes
 * 
 * Handles all HTTP requests related to workspaces.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getWorkspaceRepository, getProblemRepository, getViewRepository } from '../models/repository-factory';
import { generateId } from '../utils/id-generator';
import { Status } from '../../../shared/types';
import { PrismaClient } from '@prisma/client';

// Extend Express Request to include optional Prisma client
declare global {
  namespace Express {
    interface Request {
      prisma?: PrismaClient;
    }
  }
}

const router = Router();

// Input validation constants
const MAX_NAME_LENGTH = 255;
const MAX_TEXT_FIELD_LENGTH = 10000; // For problem, objective, etc.
const MAX_ARRAY_ITEM_LENGTH = 500; // For individual items in arrays
const MAX_LABELS_COUNT = 50; // Maximum number of labels

// Middleware to use Prisma client from request if available (for testing)
const getRepositoryWithPrisma = (req: Request) => {
  return req.prisma ? getWorkspaceRepository(req.prisma) : getWorkspaceRepository();
};

const getProblemRepositoryWithPrisma = (req: Request) => {
  return req.prisma ? getProblemRepository(req.prisma) : getProblemRepository();
};

const getViewRepositoryWithPrisma = (req: Request) => {
  return req.prisma ? getViewRepository(req.prisma) : getViewRepository();
};

/**
 * GET /api/workspaces
 * List all non-deleted workspaces
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    const workspaces = await repository.findAll(req.organizationId);
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ 
        error: `Workspace name too long (max ${MAX_NAME_LENGTH} characters)` 
      });
    }
    
    const repository = getRepositoryWithPrisma(req);
    const workspace = await repository.create({
      id: await generateId(),
      organizationId: req.organizationId,
      name: trimmedName,
    });
    
    // Create default "All Problems" view for the new workspace
    const viewRepo = getViewRepositoryWithPrisma(req);
    await viewRepo.create({
      id: await generateId(),
      workspaceId: workspace.id,
      organizationId: req.organizationId,
      name: 'All Problems',
      filters: {
        selectedStatuses: [Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved],
        selectedLabels: [],
      },
      isDefault: true,
    });
    
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

/**
 * GET /api/workspaces/:workspaceId/problems
 * List all problems for a workspace
 * 
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:workspaceId/problems', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    // Verify workspace exists
    const workspaceRepo = getRepositoryWithPrisma(req);
    const workspace = await workspaceRepo.findById(workspaceId, req.organizationId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    const problemRepo = getProblemRepositoryWithPrisma(req);
    const problems = await problemRepo.findByWorkspaceId(workspaceId, req.organizationId);
    
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

/**
 * POST /api/workspaces/:workspaceId/problems
 * Create a new problem in a workspace
 */
router.post('/:workspaceId/problems', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const {
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status,
      priority,
      labels,
      parentId,
    } = req.body;
    
    // Verify workspace exists
    const workspaceRepo = getRepositoryWithPrisma(req);
    const workspace = await workspaceRepo.findById(workspaceId, req.organizationId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    // Validation
    if (!problem || typeof problem !== 'string' || problem.trim().length === 0) {
      return res.status(400).json({ error: 'Problem field is required' });
    }
    
    if (problem.length > MAX_TEXT_FIELD_LENGTH) {
      return res.status(400).json({ 
        error: `Problem field too long (max ${MAX_TEXT_FIELD_LENGTH} characters)` 
      });
    }
    
    if (!objective || typeof objective !== 'string' || objective.trim().length === 0) {
      return res.status(400).json({ error: 'Objective field is required' });
    }
    
    if (objective.length > MAX_TEXT_FIELD_LENGTH) {
      return res.status(400).json({ 
        error: `Objective field too long (max ${MAX_TEXT_FIELD_LENGTH} characters)` 
      });
    }
    
    // Validate array fields length
    if (keyResults && Array.isArray(keyResults)) {
      if (keyResults.length > 100) {
        return res.status(400).json({ error: 'Too many key results (max 100)' });
      }
      for (const item of keyResults) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Key result item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (actions && Array.isArray(actions)) {
      if (actions.length > 100) {
        return res.status(400).json({ error: 'Too many actions (max 100)' });
      }
      for (const item of actions) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Action item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (blockers && Array.isArray(blockers)) {
      if (blockers.length > 100) {
        return res.status(400).json({ error: 'Too many blockers (max 100)' });
      }
      for (const item of blockers) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Blocker item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (labels && Array.isArray(labels)) {
      if (labels.length > MAX_LABELS_COUNT) {
        return res.status(400).json({ 
          error: `Too many labels (max ${MAX_LABELS_COUNT})` 
        });
      }
      for (const label of labels) {
        if (typeof label !== 'string' || label.trim().length === 0) {
          return res.status(400).json({ error: 'Labels must be non-empty strings' });
        }
        if (label.length > 100) {
          return res.status(400).json({ error: 'Label too long (max 100 characters)' });
        }
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = Object.values(Status) as string[];
      // Also check enum keys in case it's sent as the key name
      const validStatusValues = ['Actionable', 'In Progress', 'Blocked', 'Resolved'];
      const statusStr = String(status);
      if (!validStatuses.includes(statusStr) && !validStatusValues.includes(statusStr)) {
        return res.status(400).json({ 
          error: `Invalid status value: ${status}. Valid values are: ${validStatusValues.join(', ')}` 
        });
      }
    }
    
    // Validate priority if provided
    if (priority !== undefined && (typeof priority !== 'number' || priority < 0 || priority > 1000)) {
      return res.status(400).json({ 
        error: 'Priority must be a number between 0 and 1000' 
      });
    }
    
    // Validate parentId if provided
    if (parentId) {
      if (typeof parentId !== 'string') {
        return res.status(400).json({ error: 'Parent ID must be a string' });
      }
      const problemRepo = getProblemRepositoryWithPrisma(req);
      const parent = await problemRepo.findById(parentId, req.organizationId);
      if (!parent || parent.workspaceId !== workspaceId) {
        return res.status(400).json({ error: 'Parent problem not found or belongs to different workspace' });
      }
    }
    
    const problemRepo = getProblemRepositoryWithPrisma(req);
    const created = await problemRepo.create({
      workspaceId,
      organizationId: req.organizationId,
      parentId: parentId || null,
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status: status || Status.NotStarted,
      priority: typeof priority === 'number' ? priority : undefined,
      labels: Array.isArray(labels) ? labels : undefined,
    });
    
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

/**
 * PATCH /api/workspaces/:id/use
 * Update lastUsedAt timestamp for a workspace
 * 
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.patch('/:id/use', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    
    // Check if workspace exists
    const existingWorkspace = await repository.findById(req.params.id, req.organizationId);
    if (!existingWorkspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    await repository.updateLastUsedAt(req.params.id, req.organizationId);
    
    // Return updated workspace
    const updated = await repository.findById(req.params.id, req.organizationId);
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

/**
 * PATCH /api/workspaces/:id
 * Update a workspace
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const repository = getRepositoryWithPrisma(req);
    
    // Check if workspace exists
    const existingWorkspace = await repository.findById(req.params.id, req.organizationId);
    if (!existingWorkspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Workspace name must be a non-empty string' });
      }
      const trimmedName = name.trim();
      if (trimmedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ 
          error: `Workspace name too long (max ${MAX_NAME_LENGTH} characters)` 
        });
      }
    }
    
    const updated = await repository.update(req.params.id, req.organizationId, { 
      name: name ? name.trim() : undefined 
    });
    
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

/**
 * DELETE /api/workspaces/:id
 * Soft delete a workspace
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    
    // Check if workspace exists
    const existingWorkspace = await repository.findById(req.params.id, req.organizationId);
    if (!existingWorkspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    // Check if this is the only workspace (prevent deleting the last workspace)
    const allWorkspaces = await repository.findAll(req.organizationId);
    if (allWorkspaces.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the last workspace' });
    }
    
    await repository.softDelete(req.params.id, req.organizationId);
    
    res.status(204).send();
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

/**
 * GET /api/workspaces/:id
 * Get a workspace by ID
 * 
 * NOTE: This route must come after /:workspaceId/problems and /:id/use to avoid route conflicts
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    const workspace = await repository.findById(req.params.id, req.organizationId);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

export default router;

