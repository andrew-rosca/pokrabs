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
    organizationId: string;
    name: string; 
    filters: ViewFilters;
    isDefault?: boolean;
  }): Promise<View>;

  /**
   * Find a view by ID within an organization (excluding soft-deleted)
   */
  findById(id: string, organizationId: string): Promise<View | null>;

  /**
   * Find all views for a workspace (excluding soft-deleted)
   * Workspace must belong to the specified organization
   * Ordered by lastUsedAt descending (most recent first)
   */
  findByWorkspaceId(workspaceId: string, organizationId: string): Promise<View[]>;

  /**
   * Find the default view for a workspace
   * Workspace must belong to the specified organization
   */
  findDefaultByWorkspaceId(workspaceId: string, organizationId: string): Promise<View | null>;

  /**
   * Update a view
   */
  update(id: string, organizationId: string, data: { 
    name?: string; 
    filters?: ViewFilters;
  }): Promise<View>;

  /**
   * Update lastUsedAt timestamp for a view
   */
  updateLastUsedAt(id: string, organizationId: string): Promise<void>;

  /**
   * Soft delete a view (sets deletedAt timestamp)
   */
  softDelete(id: string, organizationId: string): Promise<void>;
}

