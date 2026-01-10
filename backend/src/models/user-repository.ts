/**
 * User Repository Interface
 * 
 * Abstract interface for User data access operations.
 * Allows for easy testing and future database implementations.
 */

export interface User {
  id: string;
  organizationId: string;
  authId: string | null;
  authProvider: string | null;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUserRepository {
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by OAuth authId and provider
   */
  findByAuthId(authId: string, authProvider: string): Promise<User | null>;

  /**
   * Create a new user
   */
  create(data: {
    id: string;
    organizationId: string;
    authId?: string | null;
    authProvider?: string | null;
    email: string;
    name: string;
  }): Promise<User>;

  /**
   * Find or create a user by OAuth authId and provider
   * If user exists, returns it. If not, creates a new user.
   */
  findOrCreateByAuthId(data: {
    organizationId: string;
    authId: string;
    authProvider: string;
    email: string;
    name: string;
  }): Promise<User>;
}

