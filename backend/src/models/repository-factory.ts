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
import { IOrganizationRepository } from './organization-repository';
import { IUserRepository } from './user-repository';
import { IVoteRepository } from './vote-repository';
import { PrismaWorkspaceRepository } from './prisma-workspace-repository';
import { PrismaProblemRepository } from './prisma-problem-repository';
import { PrismaViewRepository } from './prisma-view-repository';
import { PrismaOrganizationRepository } from './prisma-organization-repository';
import { PrismaUserRepository } from './prisma-user-repository';
import { PrismaVoteRepository } from './prisma-vote-repository';

let workspaceRepository: IWorkspaceRepository | null = null;
let problemRepository: IProblemRepository | null = null;
let viewRepository: IViewRepository | null = null;
let organizationRepository: IOrganizationRepository | null = null;
let userRepository: IUserRepository | null = null;
let voteRepository: IVoteRepository | null = null;

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
 * Get or create Organization repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns Organization repository instance
 */
export function getOrganizationRepository(prisma?: PrismaClient): IOrganizationRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaOrganizationRepository(prisma);
  }

  // Production: use singleton pattern
  if (!organizationRepository) {
    organizationRepository = new PrismaOrganizationRepository(getPrismaClient());
  }

  return organizationRepository;
}

/**
 * Get or create User repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns User repository instance
 */
export function getUserRepository(prisma?: PrismaClient): IUserRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaUserRepository(prisma);
  }

  // Production: use singleton pattern
  if (!userRepository) {
    userRepository = new PrismaUserRepository(getPrismaClient());
  }

  return userRepository;
}

/**
 * Get or create Vote repository instance
 * 
 * @param prisma - Optional Prisma client (for testing)
 * @returns Vote repository instance
 */
export function getVoteRepository(prisma?: PrismaClient): IVoteRepository {
  if (prisma) {
    // For testing: create new instance with provided client
    return new PrismaVoteRepository(prisma);
  }

  // Production: use singleton pattern
  if (!voteRepository) {
    voteRepository = new PrismaVoteRepository(getPrismaClient());
  }

  return voteRepository;
}

/**
 * Reset repository singletons (for testing)
 */
export function resetRepositories(): void {
  workspaceRepository = null;
  problemRepository = null;
  viewRepository = null;
  organizationRepository = null;
  userRepository = null;
  voteRepository = null;
}

