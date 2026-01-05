/**
 * Repository Factory
 * 
 * Factory pattern for creating repository instances.
 * Supports dependency injection for testing.
 */

import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../database/prisma-client';
import { IWorkspaceRepository } from './workspace-repository';
import { IProblemRepository } from './problem-repository';
import { IViewRepository } from './view-repository';
import { PrismaWorkspaceRepository } from './prisma-workspace-repository';
import { PrismaProblemRepository } from './prisma-problem-repository';
import { PrismaViewRepository } from './prisma-view-repository';

let workspaceRepository: IWorkspaceRepository | null = null;
let problemRepository: IProblemRepository | null = null;
let viewRepository: IViewRepository | null = null;

/**
 * Get or create Workspace repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns Workspace repository instance
 */
export function getWorkspaceRepository(prisma?: PrismaClient): IWorkspaceRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaWorkspaceRepository(prisma);
  }

  // Production: use singleton pattern
  if (!workspaceRepository) {
    workspaceRepository = new PrismaWorkspaceRepository(getPrismaClient());
  }

  return workspaceRepository;
}

/**
 * Get or create Problem repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns Problem repository instance
 */
export function getProblemRepository(prisma?: PrismaClient): IProblemRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaProblemRepository(prisma);
  }

  // Production: use singleton pattern
  if (!problemRepository) {
    problemRepository = new PrismaProblemRepository(getPrismaClient());
  }

  return problemRepository;
}

/**
 * Get or create View repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns View repository instance
 */
export function getViewRepository(prisma?: PrismaClient): IViewRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaViewRepository(prisma);
  }

  // Production: use singleton pattern
  if (!viewRepository) {
    viewRepository = new PrismaViewRepository(getPrismaClient());
  }

  return viewRepository;
}

/**
 * Reset repository singletons (for testing)
 */
export function resetRepositories(): void {
  workspaceRepository = null;
  problemRepository = null;
  viewRepository = null;
}

