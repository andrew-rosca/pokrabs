/**
 * Prisma-based Vote Repository Implementation
 * 
 * Implements IVoteRepository using Prisma Client.
 * Handles vote creation, removal, and counting with atomic Problem.votes updates.
 */

import { PrismaClient } from '@prisma/client';
import { IVoteRepository, VoteRecord, VoteWithUser } from './vote-repository';
import { v4 as uuidv4 } from 'uuid';

export class PrismaVoteRepository implements IVoteRepository {
  constructor(private prisma: PrismaClient) {}

  async addVote(userId: string, problemId: string): Promise<VoteRecord> {
    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Try to find existing vote record
      const existing = await tx.vote.findUnique({
        where: {
          userId_problemId: { userId, problemId },
        },
      });

      let vote;
      if (existing) {
        // Increment existing vote count
        vote = await tx.vote.update({
          where: { id: existing.id },
          data: { count: { increment: 1 } },
        });
      } else {
        // Create new vote record
        vote = await tx.vote.create({
          data: {
            id: uuidv4(),
            userId,
            problemId,
            count: 1,
          },
        });
      }

      // Atomically increment Problem.votes
      await tx.problem.update({
        where: { id: problemId },
        data: { votes: { increment: 1 } },
      });

      return this.mapToVoteRecord(vote);
    });
  }

  async removeVote(userId: string, problemId: string): Promise<VoteRecord | null> {
    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Find existing vote record
      const existing = await tx.vote.findUnique({
        where: {
          userId_problemId: { userId, problemId },
        },
      });

      if (!existing) {
        throw new Error('Vote not found');
      }

      let vote: VoteRecord | null;
      if (existing.count <= 1) {
        // Delete the vote record
        await tx.vote.delete({
          where: { id: existing.id },
        });
        vote = null;
      } else {
        // Decrement existing vote count
        const updated = await tx.vote.update({
          where: { id: existing.id },
          data: { count: { decrement: 1 } },
        });
        vote = this.mapToVoteRecord(updated);
      }

      // Atomically decrement Problem.votes
      await tx.problem.update({
        where: { id: problemId },
        data: { votes: { decrement: 1 } },
      });

      return vote;
    });
  }

  async findByUserAndProblem(userId: string, problemId: string): Promise<VoteRecord | null> {
    const vote = await this.prisma.vote.findUnique({
      where: {
        userId_problemId: { userId, problemId },
      },
    });

    return vote ? this.mapToVoteRecord(vote) : null;
  }

  async findByUserInWorkspace(userId: string, workspaceId: string): Promise<VoteRecord[]> {
    const votes = await this.prisma.vote.findMany({
      where: {
        userId,
        problem: {
          workspaceId,
          deletedAt: null,
        },
      },
      include: {
        problem: {
          select: { id: true },
        },
      },
    });

    return votes.map(v => this.mapToVoteRecord(v));
  }

  async countActiveVotesByUserInWorkspace(userId: string, workspaceId: string): Promise<number> {
    // Count votes only on non-resolved problems
    const result = await this.prisma.vote.aggregate({
      where: {
        userId,
        problem: {
          workspaceId,
          deletedAt: null,
          // Exclude resolved problems - votes on resolved problems don't count
          NOT: {
            status: 'Resolved',
          },
        },
      },
      _sum: {
        count: true,
      },
    });

    return result._sum.count ?? 0;
  }

  async getVotersForProblem(problemId: string): Promise<VoteWithUser[]> {
    const votes = await this.prisma.vote.findMany({
      where: {
        problemId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        count: 'desc',
      },
    });

    return votes.map(v => ({
      userId: v.userId,
      userName: v.user.name,
      count: v.count,
    }));
  }

  private mapToVoteRecord(vote: {
    id: string;
    userId: string;
    problemId: string;
    count: number;
    createdAt: Date;
    updatedAt: Date;
  }): VoteRecord {
    return {
      id: vote.id,
      userId: vote.userId,
      problemId: vote.problemId,
      count: vote.count,
      createdAt: vote.createdAt,
      updatedAt: vote.updatedAt,
    };
  }
}
