/**
 * Vote Repository Interface
 * 
 * Abstract interface for Vote data access operations.
 * Allows for easy testing and future database implementations.
 */

export interface VoteRecord {
  id: string;
  userId: string;
  problemId: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteWithUser {
  userId: string;
  userName: string;
  count: number;
}

export interface IVoteRepository {
  /**
   * Create or update a vote record for a user on a problem.
   * If the user already has a vote on this problem, increments the count.
   * Also atomically increments the Problem.votes count.
   * 
   * @returns The updated vote record
   */
  addVote(userId: string, problemId: string): Promise<VoteRecord>;

  /**
   * Remove one vote from a user's vote record on a problem.
   * If count reaches 0, deletes the vote record.
   * Also atomically decrements the Problem.votes count.
   * 
   * @returns The updated vote record, or null if the record was deleted
   */
  removeVote(userId: string, problemId: string): Promise<VoteRecord | null>;

  /**
   * Get the vote record for a specific user and problem.
   * 
   * @returns The vote record, or null if none exists
   */
  findByUserAndProblem(userId: string, problemId: string): Promise<VoteRecord | null>;

  /**
   * Get all vote records for a user in a specific workspace.
   * Only includes votes on non-deleted problems.
   * 
   * @returns Array of vote records with problem info
   */
  findByUserInWorkspace(userId: string, workspaceId: string): Promise<VoteRecord[]>;

  /**
   * Count the total number of votes a user has cast on non-resolved problems
   * in a specific workspace. This is used to check against the vote limit.
   * 
   * @returns The count of active votes (sum of vote counts on non-resolved problems)
   */
  countActiveVotesByUserInWorkspace(userId: string, workspaceId: string): Promise<number>;

  /**
   * Get all voters for a specific problem, including their names and vote counts.
   * 
   * @returns Array of voters with their names and vote counts
   */
  getVotersForProblem(problemId: string): Promise<VoteWithUser[]>;
}
