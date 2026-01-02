/**
 * Problem Repository Interface
 * 
 * Abstract interface for Problem data access operations.
 * Allows for easy testing and future database implementations.
 */

import { Problem, Status } from '../../../shared/types';

export interface IProblemRepository {
  /**
   * Create a new problem
   * Automatically generates ID and computes idPath
   */
  create(data: {
    projectId: string;
    parentId?: string | null;
    problem?: string;
    objective?: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: Status;
    labels?: string[];
  }): Promise<Problem>;

  /**
   * Find a problem by ID (excluding soft-deleted)
   */
  findById(id: string): Promise<Problem | null>;

  /**
   * Find all problems in a project (excluding soft-deleted)
   */
  findByProjectId(projectId: string): Promise<Problem[]>;

  /**
   * Find all child problems of a parent (excluding soft-deleted)
   */
  findByParentId(parentId: string): Promise<Problem[]>;

  /**
   * Update a problem
   */
  update(
    id: string,
    data: {
      problem?: string;
      objective?: string;
      keyResults?: string;
      actions?: string;
      blockers?: string;
      status?: Status;
      votes?: number;
      priority?: number;
      labels?: string[];
    }
  ): Promise<Problem>;

  /**
   * Soft delete a problem (sets deletedAt timestamp)
   */
  softDelete(id: string): Promise<void>;

  /**
   * Check if a problem ID exists in a project (excluding soft-deleted)
   * Note: With LCG-based IDs, this is mainly for validation
   */
  checkIdExists(id: string, projectId: string): Promise<boolean>;

  /**
   * Move a problem to a new parent and/or position.
   * Updates the problem's parentId, idPath, priority, and all descendants' idPaths.
   * 
   * @param id - The problem ID to move
   * @param newParentId - The new parent ID (null for root level)
   * @param afterProblemId - Insert after this sibling (null means insert first among siblings)
   * @returns The updated problem
   */
  move(
    id: string,
    newParentId: string | null,
    afterProblemId: string | null
  ): Promise<Problem>;
}

