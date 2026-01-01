/**
 * Prisma-based Problem Repository Implementation
 * 
 * Implements IProblemRepository using Prisma Client.
 * Handles ID generation, idPath computation, and soft deletes.
 */

import { PrismaClient, ProblemStatus } from '@prisma/client';
import { IProblemRepository } from './problem-repository';
import { Problem, Status } from '../../../shared/types';
import { generateProblemId } from '../utils/id-generator';
import { computeIdPath } from '../utils/id-path';

export class PrismaProblemRepository implements IProblemRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    projectId: string;
    parentId?: string | null;
    problem?: string;
    objective?: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: Status;
    labels?: string[];
  }): Promise<Problem> {
    // Generate unique ID
    const id = await generateProblemId();

    // Compute idPath
    const idPath = await computeIdPath(id, data.parentId ?? null, data.projectId);

    // Map Status enum from shared types to Prisma enum
    const prismaStatus = this.mapStatusToPrisma(data.status ?? Status.NotStarted);

    // Create the problem
    const problem = await this.prisma.problem.create({
      data: {
        id,
        idPath,
        projectId: data.projectId,
        parentId: data.parentId ?? null,
        problem: data.problem ?? '{"summary": "", "detail": ""}',
        objective: data.objective ?? '{"summary": "", "detail": ""}',
        keyResults: data.keyResults ?? '[]',
        actions: data.actions ?? '[]',
        blockers: data.blockers ?? '[]',
        status: prismaStatus,
        labels: JSON.stringify(data.labels ?? []),
      },
    });

    return this.mapToProblem(problem);
  }

  async findById(id: string): Promise<Problem | null> {
    const problem = await this.prisma.problem.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return problem ? this.mapToProblem(problem) : null;
  }

  async findByProjectId(projectId: string): Promise<Problem[]> {
    const problems = await this.prisma.problem.findMany({
      where: {
        projectId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return problems.map(p => this.mapToProblem(p));
  }

  async findByParentId(parentId: string): Promise<Problem[]> {
    const problems = await this.prisma.problem.findMany({
      where: {
        parentId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return problems.map(p => this.mapToProblem(p));
  }

  async update(
    id: string,
    data: {
      problem?: string;
      objective?: string;
      keyResults?: string;
      actions?: string;
      blockers?: string;
      status?: Status;
      votes?: number;
      priority?: number;
      labels?: string[];
    }
  ): Promise<Problem> {
    const updateData: any = {};

    if (data.problem !== undefined) updateData.problem = data.problem;
    if (data.objective !== undefined) updateData.objective = data.objective;
    if (data.keyResults !== undefined) updateData.keyResults = data.keyResults;
    if (data.actions !== undefined) updateData.actions = data.actions;
    if (data.blockers !== undefined) updateData.blockers = data.blockers;
    if (data.status !== undefined) updateData.status = this.mapStatusToPrisma(data.status);
    if (data.votes !== undefined) updateData.votes = data.votes;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.labels !== undefined) updateData.labels = JSON.stringify(data.labels);

    const problem = await this.prisma.problem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToProblem(problem);
  }

  async softDelete(id: string): Promise<void> {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      select: { idPath: true },
    });

    if (!problem) {
      throw new Error('Problem not found');
    }

    const deletedAt = new Date();
    const descendantPrefix = `${problem.idPath}-`;

    await this.prisma.$transaction([
      // Soft delete the target problem
      this.prisma.problem.update({
        where: { id },
        data: { deletedAt },
      }),
      // Cascade soft delete to all descendants using idPath prefix
      this.prisma.problem.updateMany({
        where: {
          idPath: {
            startsWith: descendantPrefix,
          },
        },
        data: { deletedAt },
      }),
    ]);
  }

  async checkIdExists(id: string, projectId: string): Promise<boolean> {
    const problem = await this.prisma.problem.findFirst({
      where: {
        id,
        projectId,
        deletedAt: null, // Exclude soft-deleted
      },
      select: {
        id: true,
      },
    });

    return problem !== null;
  }

  /**
   * Map Prisma ProblemStatus enum to shared Status enum
   */
  private mapStatusToPrisma(status: Status): ProblemStatus {
    switch (status) {
      case Status.NotStarted:
        return ProblemStatus.NotStarted;
      case Status.InProgress:
        return ProblemStatus.InProgress;
      case Status.Blocked:
        return ProblemStatus.Blocked;
      case Status.Resolved:
        return ProblemStatus.Resolved;
      default:
        return ProblemStatus.NotStarted;
    }
  }

  /**
   * Map Prisma ProblemStatus enum to shared Status enum
   */
  private mapStatusFromPrisma(status: ProblemStatus): Status {
    switch (status) {
      case ProblemStatus.NotStarted:
        return Status.NotStarted;
      case ProblemStatus.InProgress:
        return Status.InProgress;
      case ProblemStatus.Blocked:
        return Status.Blocked;
      case ProblemStatus.Resolved:
        return Status.Resolved;
    }
  }

  /**
   * Map Prisma Problem model to shared Problem type
   */
  private mapToProblem(problem: {
    id: string;
    idPath: string;
    problem: string;
    objective: string;
    keyResults: string;
    actions: string;
    blockers: string;
    status: ProblemStatus;
    votes: number;
    priority: number;
    labels: string;
    parentId: string | null;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Problem {
    return {
      id: problem.id,
      idPath: problem.idPath,
      problem: problem.problem,
      objective: problem.objective,
      keyResults: problem.keyResults,
      actions: problem.actions,
      blockers: problem.blockers,
      status: this.mapStatusFromPrisma(problem.status),
      votes: problem.votes,
      priority: problem.priority,
      labels: JSON.parse(problem.labels),
      parentId: problem.parentId,
      projectId: problem.projectId,
      createdAt: problem.createdAt.toISOString(),
      updatedAt: problem.updatedAt.toISOString(),
      deletedAt: problem.deletedAt?.toISOString() ?? null,
    };
  }
}

