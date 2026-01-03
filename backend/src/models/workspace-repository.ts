/**
 * Workspace Repository Interface
 * 
 * Abstract interface for Workspace data access operations.
 * Allows for easy testing and future database implementations.
 */

import { Workspace } from '../../../shared/types';

export interface IWorkspaceRepository {
  /**
   * Create a new workspace
   */
  create(data: { id: string; name: string }): Promise<Workspace>;

  /**
   * Find a workspace by ID (excluding soft-deleted)
   */
  findById(id: string): Promise<Workspace | null>;

  /**
   * Find all workspaces (excluding soft-deleted)
   */
  findAll(): Promise<Workspace[]>;

  /**
   * Update a workspace
   */
  update(id: string, data: { name?: string }): Promise<Workspace>;

  /**
   * Soft delete a workspace (sets deletedAt timestamp)
   */
  softDelete(id: string): Promise<void>;
}

