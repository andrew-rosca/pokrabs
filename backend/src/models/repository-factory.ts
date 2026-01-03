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
import { PrismaWorkspaceRepository } from './prisma-workspace-repository';
import { PrismaProblemRepository } from './prisma-problem-repository';

let workspaceRepository: IWorkspaceRepository | null = null;
let problemRepository: IProblemRepository | null = null;

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
 * Reset repository singletons (for testing)
 */
export function resetRepositories(): void {
  workspaceRepository = null;
  problemRepository = null;
}

