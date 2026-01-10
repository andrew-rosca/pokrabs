/**
 * Problems API Routes
 * 
 * Handles all HTTP requests related to problems.
 */

import { Router, Request, Response } from 'express';
import { getProblemRepository } from '../models/repository-factory';
import { Status } from '../../../shared/types';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Input validation constants
const MAX_TEXT_FIELD_LENGTH = 10000; // For problem, objective, etc.
const MAX_ARRAY_ITEM_LENGTH = 500; // For individual items in arrays
const MAX_LABELS_COUNT = 50; // Maximum number of labels

// Helper to get repository with Prisma client from request if available (for testing)
const getProblemRepoWithPrisma = (req: Request) => {
  return req.prisma ? getProblemRepository(req.prisma) : getProblemRepository();
};

/**
 * GET /api/problems/:id
 * Get a problem by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const problemRepo = getProblemRepoWithPrisma(req);
    const problem = await problemRepo.findById(req.params.id, req.organizationId);
    
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

/**
 * PATCH /api/problems/:id
 * Update a problem
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const {
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status,
      votes,
      priority,
      labels,
    } = req.body;
    
    // Validate text fields length if provided
    if (problem !== undefined) {
      if (typeof problem !== 'string') {
        return res.status(400).json({ error: 'Problem must be a string' });
      }
      if (problem.trim().length === 0) {
        return res.status(400).json({ error: 'Problem cannot be empty' });
      }
      if (problem.length > MAX_TEXT_FIELD_LENGTH) {
        return res.status(400).json({ 
          error: `Problem field too long (max ${MAX_TEXT_FIELD_LENGTH} characters)` 
        });
      }
    }
    
    if (objective !== undefined) {
      if (typeof objective !== 'string') {
        return res.status(400).json({ error: 'Objective must be a string' });
      }
      if (objective.trim().length === 0) {
        return res.status(400).json({ error: 'Objective cannot be empty' });
      }
      if (objective.length > MAX_TEXT_FIELD_LENGTH) {
        return res.status(400).json({ 
          error: `Objective field too long (max ${MAX_TEXT_FIELD_LENGTH} characters)` 
        });
      }
    }
    
    // Validate array fields length if provided
    // Accept both arrays and JSON strings (for backward compatibility)
    if (keyResults !== undefined) {
      let keyResultsArray: any[];
      if (typeof keyResults === 'string') {
        try {
          keyResultsArray = JSON.parse(keyResults);
          if (!Array.isArray(keyResultsArray)) {
            return res.status(400).json({ error: 'Key results must be a JSON array string' });
          }
        } catch {
          return res.status(400).json({ error: 'Key results must be a valid JSON array string' });
        }
      } else if (Array.isArray(keyResults)) {
        keyResultsArray = keyResults;
      } else {
        return res.status(400).json({ error: 'Key results must be an array or JSON array string' });
      }
      
      if (keyResultsArray.length > 100) {
        return res.status(400).json({ error: 'Too many key results (max 100)' });
      }
      for (const item of keyResultsArray) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Key result item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (actions !== undefined) {
      let actionsArray: any[];
      if (typeof actions === 'string') {
        try {
          actionsArray = JSON.parse(actions);
          if (!Array.isArray(actionsArray)) {
            return res.status(400).json({ error: 'Actions must be a JSON array string' });
          }
        } catch {
          return res.status(400).json({ error: 'Actions must be a valid JSON array string' });
        }
      } else if (Array.isArray(actions)) {
        actionsArray = actions;
      } else {
        return res.status(400).json({ error: 'Actions must be an array or JSON array string' });
      }
      
      if (actionsArray.length > 100) {
        return res.status(400).json({ error: 'Too many actions (max 100)' });
      }
      for (const item of actionsArray) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Action item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (blockers !== undefined) {
      let blockersArray: any[];
      if (typeof blockers === 'string') {
        try {
          blockersArray = JSON.parse(blockers);
          if (!Array.isArray(blockersArray)) {
            return res.status(400).json({ error: 'Blockers must be a JSON array string' });
          }
        } catch {
          return res.status(400).json({ error: 'Blockers must be a valid JSON array string' });
        }
      } else if (Array.isArray(blockers)) {
        blockersArray = blockers;
      } else {
        return res.status(400).json({ error: 'Blockers must be an array or JSON array string' });
      }
      
      if (blockersArray.length > 100) {
        return res.status(400).json({ error: 'Too many blockers (max 100)' });
      }
      for (const item of blockersArray) {
        if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
          return res.status(400).json({ 
            error: `Blocker item too long (max ${MAX_ARRAY_ITEM_LENGTH} characters)` 
          });
        }
      }
    }
    
    if (labels !== undefined) {
      if (!Array.isArray(labels)) {
        return res.status(400).json({ error: 'Labels must be an array' });
      }
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
    if (status !== undefined && !Object.values(Status).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Validate votes and priority are numbers if provided
    if (votes !== undefined) {
      if (typeof votes !== 'number' || !Number.isInteger(votes) || votes < 0) {
        return res.status(400).json({ error: 'Votes must be a non-negative integer' });
      }
    }
    
    if (priority !== undefined) {
      if (typeof priority !== 'number') {
        return res.status(400).json({ error: 'Priority must be a number' });
      }
      if (priority < 0 || priority > 10000) {
        return res.status(400).json({ 
          error: 'Priority must be a number between 0 and 10000' 
        });
      }
    }
    
    const problemRepo = getProblemRepoWithPrisma(req);
    const updated = await problemRepo.update(req.params.id, req.organizationId, {
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status,
      votes,
      priority,
      labels: Array.isArray(labels) ? labels : undefined,
    });
    
    res.json(updated);
  } catch (error: any) {
    if (error.name === 'PrismaClientKnownRequestError' && error.code === 'P2025') {
      return res.status(404).json({ error: 'Problem not found' });
    }
    if (error.message && error.message.includes('Problem not found')) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.status(500).json({ error: 'Failed to update problem' });
  }
});

/**
 * DELETE /api/problems/:id
 * Soft delete a problem
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const problemRepo = getProblemRepoWithPrisma(req);
    
    // Check if problem exists
    const problem = await problemRepo.findById(req.params.id, req.organizationId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    await problemRepo.softDelete(req.params.id, req.organizationId);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete problem' });
  }
});

/**
 * PATCH /api/problems/:id/move
 * Move a problem to a new parent and/or position
 * 
 * Body:
 *   - newParentId: string | null - The new parent ID (null for root level)
 *   - afterProblemId: string | null - Insert after this sibling (null means first)
 */
router.patch('/:id/move', async (req: Request, res: Response) => {
  try {
    const { newParentId, afterProblemId } = req.body;
    
    // Validate that newParentId and afterProblemId are strings or null
    if (newParentId !== null && newParentId !== undefined && typeof newParentId !== 'string') {
      return res.status(400).json({ error: 'newParentId must be a string or null' });
    }
    
    if (afterProblemId !== null && afterProblemId !== undefined && typeof afterProblemId !== 'string') {
      return res.status(400).json({ error: 'afterProblemId must be a string or null' });
    }
    
    const problemRepo = getProblemRepoWithPrisma(req);
    
    const updated = await problemRepo.move(
      req.params.id,
      req.organizationId,
      newParentId ?? null,
      afterProblemId ?? null
    );
    
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'Problem not found' || error.message === 'New parent not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot move')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error moving problem:', error);
    res.status(500).json({ error: 'Failed to move problem' });
  }
});

/**
 * PATCH /api/problems/:id/reorder
 * Reorder a problem within its current parent to a specific position
 * 
 * Body:
 *   - position: 'top' | 'bottom' | number - Target position (number is 1-based index)
 */
router.patch('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const { position } = req.body;
    
    // Validate position
    if (position === undefined || position === null) {
      return res.status(400).json({ error: 'position is required' });
    }
    
    if (position !== 'top' && position !== 'bottom' && typeof position !== 'number') {
      return res.status(400).json({ error: 'position must be "top", "bottom", or a number' });
    }
    
    if (typeof position === 'number' && (!Number.isInteger(position) || position < 1)) {
      return res.status(400).json({ error: 'position number must be a positive integer' });
    }
    
    const problemRepo = getProblemRepoWithPrisma(req);
    
    const updated = await problemRepo.reorder(
      req.params.id,
      req.organizationId,
      position
    );
    
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'Problem not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Position must be')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error reordering problem:', error);
    res.status(500).json({ error: 'Failed to reorder problem' });
  }
});

export default router;

