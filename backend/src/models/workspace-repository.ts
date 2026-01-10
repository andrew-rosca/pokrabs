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
  create(data: { id: string; organizationId: string; name: string }): Promise<Workspace>;

  /**
   * Find a workspace by ID within an organization (excluding soft-deleted)
   */
  findById(id: string, organizationId: string): Promise<Workspace | null>;

  /**
   * Find all workspaces in an organization (excluding soft-deleted)
   */
  findAll(organizationId: string): Promise<Workspace[]>;

  /**
   * Update a workspace
   */
  update(id: string, organizationId: string, data: { name?: string }): Promise<Workspace>;

  /**
   * Update lastUsedAt timestamp for a workspace
   */
  updateLastUsedAt(id: string, organizationId: string): Promise<void>;

  /**
   * Soft delete a workspace (sets deletedAt timestamp)
   */
  softDelete(id: string, organizationId: string): Promise<void>;
}

