/**
 * Projects API Routes
 * 
 * Handles all HTTP requests related to projects.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getProjectRepository, getProblemRepository } from '../models/repository-factory';
import { v4 as uuidv4 } from 'uuid';
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

// Middleware to use Prisma client from request if available (for testing)
const getRepositoryWithPrisma = (req: Request) => {
  return req.prisma ? getProjectRepository(req.prisma) : getProjectRepository();
};

const getProblemRepositoryWithPrisma = (req: Request) => {
  return req.prisma ? getProblemRepository(req.prisma) : getProblemRepository();
};

/**
 * GET /api/projects
 * List all non-deleted projects
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    const projects = await repository.findAll();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const repository = getRepositoryWithPrisma(req);
    const project = await repository.create({
      id: uuidv4(),
      name: name.trim(),
    });
    
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * GET /api/projects/:projectId/problems
 * List all problems for a project
 * 
 * NOTE: This route must come before /:id to avoid route conflicts
 */
router.get('/:projectId/problems', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    // Verify project exists
    const projectRepo = getRepositoryWithPrisma(req);
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const problemRepo = getProblemRepositoryWithPrisma(req);
    const problems = await problemRepo.findByProjectId(projectId);
    
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

/**
 * POST /api/projects/:projectId/problems
 * Create a new problem in a project
 */
router.post('/:projectId/problems', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status,
      labels,
      parentId,
    } = req.body;
    
    // Verify project exists
    const projectRepo = getRepositoryWithPrisma(req);
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Validation
    if (!problem || typeof problem !== 'string') {
      return res.status(400).json({ error: 'Problem field is required' });
    }
    
    if (!objective || typeof objective !== 'string') {
      return res.status(400).json({ error: 'Objective field is required' });
    }
    
    // Validate status if provided
    if (status && !Object.values(Status).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Validate parentId if provided
    if (parentId) {
      const problemRepo = getProblemRepositoryWithPrisma(req);
      const parent = await problemRepo.findById(parentId);
      if (!parent || parent.projectId !== projectId) {
        return res.status(400).json({ error: 'Parent problem not found or belongs to different project' });
      }
    }
    
    const problemRepo = getProblemRepositoryWithPrisma(req);
    const created = await problemRepo.create({
      projectId,
      parentId: parentId || null,
      problem,
      objective,
      keyResults,
      actions,
      blockers,
      status: status || Status.NotStarted,
      labels: Array.isArray(labels) ? labels : undefined,
    });
    
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create problem' });
  }
});

/**
 * GET /api/projects/:id
 * Get a project by ID
 * 
 * NOTE: This route must come after /:projectId/problems to avoid route conflicts
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const repository = getRepositoryWithPrisma(req);
    const project = await repository.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

export default router;

