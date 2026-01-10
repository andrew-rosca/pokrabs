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
    workspaceId: string;
    organizationId: string;
    parentId?: string | null;
    problem?: string;
    objective?: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: Status;
    priority?: number;
    labels?: string[];
  }): Promise<Problem>;

  /**
   * Find a problem by ID within an organization (excluding soft-deleted)
   */
  findById(id: string, organizationId: string): Promise<Problem | null>;

  /**
   * Find all problems in a workspace (excluding soft-deleted)
   * Workspace must belong to the specified organization
   */
  findByWorkspaceId(workspaceId: string, organizationId: string): Promise<Problem[]>;

  /**
   * Find all child problems of a parent (excluding soft-deleted)
   * Parent must belong to the specified organization
   */
  findByParentId(parentId: string, organizationId: string): Promise<Problem[]>;

  /**
   * Update a problem
   */
  update(
    id: string,
    organizationId: string,
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
  softDelete(id: string, organizationId: string): Promise<void>;

  /**
   * Check if a problem ID exists in a workspace (excluding soft-deleted)
   * Note: With LCG-based IDs, this is mainly for validation
   */
  checkIdExists(id: string, workspaceId: string, organizationId: string): Promise<boolean>;

  /**
   * Move a problem to a new parent and/or position.
   * Updates the problem's parentId, idPath, priority, and all descendants' idPaths.
   * 
   * @param id - The problem ID to move
   * @param organizationId - The organization ID (for security)
   * @param newParentId - The new parent ID (null for root level)
   * @param afterProblemId - Insert after this sibling (null means insert first among siblings)
   * @returns The updated problem
   */
  move(
    id: string,
    organizationId: string,
    newParentId: string | null,
    afterProblemId: string | null
  ): Promise<Problem>;

  /**
   * Reorder a problem within its current parent to a specific position.
   * 
   * @param id - The problem ID to reorder
   * @param organizationId - The organization ID (for security)
   * @param position - Target position: 'top' (first among siblings), 'bottom' (last among siblings), or a number (1-based index)
   * @returns The updated problem
   */
  reorder(
    id: string,
    organizationId: string,
    position: 'top' | 'bottom' | number
  ): Promise<Problem>;
}

