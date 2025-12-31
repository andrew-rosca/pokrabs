/**
 * Project Repository Interface
 * 
 * Abstract interface for Project data access operations.
 * Allows for easy testing and future database implementations.
 */

import { Project } from '../../../shared/types';

export interface IProjectRepository {
  /**
   * Create a new project
   */
  create(data: { id: string; name: string }): Promise<Project>;

  /**
   * Find a project by ID (excluding soft-deleted)
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Find all projects (excluding soft-deleted)
   */
  findAll(): Promise<Project[]>;

  /**
   * Update a project
   */
  update(id: string, data: { name?: string }): Promise<Project>;

  /**
   * Soft delete a project (sets deletedAt timestamp)
   */
  softDelete(id: string): Promise<void>;
}

