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
    const problem = await problemRepo.findById(req.params.id);
    
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
    
    // Validate status if provided
    if (status && !Object.values(Status).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Validate votes and priority are numbers if provided
    if (votes !== undefined && typeof votes !== 'number') {
      return res.status(400).json({ error: 'Votes must be a number' });
    }
    
    if (priority !== undefined && typeof priority !== 'number') {
      return res.status(400).json({ error: 'Priority must be a number' });
    }
    
    const problemRepo = getProblemRepoWithPrisma(req);
    const updated = await problemRepo.update(req.params.id, {
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
    const problem = await problemRepo.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    await problemRepo.softDelete(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete problem' });
  }
});

export default router;

