/**
 * View Repository Interface
 * 
 * Abstract interface for View data access operations.
 * Allows for easy testing and future database implementations.
 */

import { View, ViewFilters } from '../../../shared/types';

export interface IViewRepository {
  /**
   * Create a new view
   */
  create(data: { 
    id: string; 
    workspaceId: string; 
    name: string; 
    filters: ViewFilters;
    isDefault?: boolean;
  }): Promise<View>;

  /**
   * Find a view by ID (excluding soft-deleted)
   */
  findById(id: string): Promise<View | null>;

  /**
   * Find all views for a workspace (excluding soft-deleted)
   * Ordered by lastUsedAt descending (most recent first)
   */
  findByWorkspaceId(workspaceId: string): Promise<View[]>;

  /**
   * Find the default view for a workspace
   */
  findDefaultByWorkspaceId(workspaceId: string): Promise<View | null>;

  /**
   * Update a view
   */
  update(id: string, data: { 
    name?: string; 
    filters?: ViewFilters;
  }): Promise<View>;

  /**
   * Update lastUsedAt timestamp for a view
   */
  updateLastUsedAt(id: string): Promise<void>;

  /**
   * Soft delete a view (sets deletedAt timestamp)
   */
  softDelete(id: string): Promise<void>;
}

