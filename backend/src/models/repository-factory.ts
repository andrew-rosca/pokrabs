/**
 * Repository Factory
 * 
 * Factory pattern for creating repository instances.
 * Supports dependency injection for testing.
 */

import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../database/prisma-client';
import { IProjectRepository } from './project-repository';
import { IProblemRepository } from './problem-repository';
import { PrismaProjectRepository } from './prisma-project-repository';
import { PrismaProblemRepository } from './prisma-problem-repository';

let projectRepository: IProjectRepository | null = null;
let problemRepository: IProblemRepository | null = null;

/**
 * Get or create Project repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns Project repository instance
 */
export function getProjectRepository(prisma?: PrismaClient): IProjectRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaProjectRepository(prisma);
  }

  // Production: use singleton pattern
  if (!projectRepository) {
    projectRepository = new PrismaProjectRepository(getPrismaClient());
  }

  return projectRepository;
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
  projectRepository = null;
  problemRepository = null;
}

