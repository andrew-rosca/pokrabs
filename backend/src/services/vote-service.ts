/**
 * Vote Service
 * 
 * Business logic for voting operations.
 * Handles vote limits, validation, and orchestrates repository calls.
 */

import { PrismaClient } from '@prisma/client';
import { IVoteRepository, VoteWithUser } from '../models/vote-repository';
import { IProblemRepository } from '../models/problem-repository';
import { getVoteRepository, getProblemRepository } from '../models/repository-factory';
import { Problem, Status, VoteResponse, VoteStatusResponse } from '../../../shared/types';

// Default max votes per user per workspace (can be overridden via environment variable)
const DEFAULT_MAX_VOTES = 10;

/**
 * Get the maximum votes allowed per user per workspace
 */
export function getMaxVotesPerUser(): number {
  const envValue = process.env.MAX_VOTES_PER_USER;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_VOTES;
}

export class VoteService {
  private voteRepo: IVoteRepository;
  private problemRepo: IProblemRepository;

  constructor(prisma?: PrismaClient) {
    this.voteRepo = getVoteRepository(prisma);
    this.problemRepo = getProblemRepository(prisma);
  }

  /**
   * Add a vote to a problem.
   * 
   * @throws Error if problem not found, problem is resolved, or vote limit exceeded
   */
  async addVote(
    userId: string,
    organizationId: string,
    problemId: string
  ): Promise<VoteResponse> {
    // Get the problem to validate
    const problem = await this.problemRepo.findById(problemId, organizationId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    // Cannot vote on resolved problems
    if (problem.status === Status.Resolved) {
      throw new Error('Cannot vote on resolved problems');
    }

    // Check vote limit
    const activeVotes = await this.voteRepo.countActiveVotesByUserInWorkspace(
      userId,
      problem.workspaceId
    );
    const maxVotes = getMaxVotesPerUser();

    if (activeVotes >= maxVotes) {
      throw new Error(`Vote limit reached (${maxVotes} votes per workspace)`);
    }

    // Add the vote
    await this.voteRepo.addVote(userId, problemId);

    // Get updated problem
    const updatedProblem = await this.problemRepo.findById(problemId, organizationId);
    if (!updatedProblem) {
      throw new Error('Problem not found after vote');
    }

    // Get user's vote count on this problem
    const userVote = await this.voteRepo.findByUserAndProblem(userId, problemId);
    const userVoteCount = userVote?.count ?? 0;

    // Get updated available votes
    const newActiveVotes = await this.voteRepo.countActiveVotesByUserInWorkspace(
      userId,
      problem.workspaceId
    );

    // Get all voters for this problem
    const voters = await this.voteRepo.getVotersForProblem(problemId);

    return {
      problem: updatedProblem,
      userVoteCount,
      availableVotes: maxVotes - newActiveVotes,
      voters: voters.map(v => ({
        userId: v.userId,
        userName: v.userName,
        count: v.count,
      })),
    };
  }

  /**
   * Remove a vote from a problem.
   * 
   * @throws Error if problem not found or user has no votes on this problem
   */
  async removeVote(
    userId: string,
    organizationId: string,
    problemId: string
  ): Promise<VoteResponse> {
    // Get the problem to validate (and get workspaceId)
    const problem = await this.problemRepo.findById(problemId, organizationId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    // Check if user has votes on this problem
    const existingVote = await this.voteRepo.findByUserAndProblem(userId, problemId);
    if (!existingVote) {
      throw new Error('No votes to remove');
    }

    // Remove the vote
    await this.voteRepo.removeVote(userId, problemId);

    // Get updated problem
    const updatedProblem = await this.problemRepo.findById(problemId, organizationId);
    if (!updatedProblem) {
      throw new Error('Problem not found after vote removal');
    }

    // Get user's remaining vote count on this problem
    const userVote = await this.voteRepo.findByUserAndProblem(userId, problemId);
    const userVoteCount = userVote?.count ?? 0;

    // Get updated available votes
    const maxVotes = getMaxVotesPerUser();
    const activeVotes = await this.voteRepo.countActiveVotesByUserInWorkspace(
      userId,
      problem.workspaceId
    );

    // Get all voters for this problem
    const voters = await this.voteRepo.getVotersForProblem(problemId);

    return {
      problem: updatedProblem,
      userVoteCount,
      availableVotes: maxVotes - activeVotes,
      voters: voters.map(v => ({
        userId: v.userId,
        userName: v.userName,
        count: v.count,
      })),
    };
  }

  /**
   * Get vote status for a user in a workspace.
   * Returns available votes and map of user's votes per problem.
   */
  async getVoteStatus(
    userId: string,
    workspaceId: string
  ): Promise<VoteStatusResponse> {
    const maxVotes = getMaxVotesPerUser();
    const activeVotes = await this.voteRepo.countActiveVotesByUserInWorkspace(
      userId,
      workspaceId
    );

    // Get all user's votes in this workspace
    const votes = await this.voteRepo.findByUserInWorkspace(userId, workspaceId);
    
    const userVotes: Record<string, number> = {};
    for (const vote of votes) {
      userVotes[vote.problemId] = vote.count;
    }

    return {
      availableVotes: maxVotes - activeVotes,
      maxVotes,
      userVotes,
    };
  }

  /**
   * Get voters for a specific problem.
   */
  async getVotersForProblem(
    organizationId: string,
    problemId: string
  ): Promise<VoteWithUser[]> {
    // Validate problem exists and belongs to organization
    const problem = await this.problemRepo.findById(problemId, organizationId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    return this.voteRepo.getVotersForProblem(problemId);
  }
}

// Factory function for creating VoteService instances
export function getVoteService(prisma?: PrismaClient): VoteService {
  return new VoteService(prisma);
}
