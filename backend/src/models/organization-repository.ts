/**
 * Organization Repository Interface
 * 
 * Abstract interface for Organization data access operations.
 * Allows for easy testing and future database implementations.
 */

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizationRepository {
  /**
   * Find an organization by ID
   */
  findById(id: string): Promise<Organization | null>;

  /**
   * Find the default organization (used for all data)
   */
  findDefault(): Promise<Organization | null>;

  /**
   * Create a new organization
   */
  create(data: { id: string; name: string }): Promise<Organization>;
}

