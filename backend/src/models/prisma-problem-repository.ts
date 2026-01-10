/**
 * Prisma-based Problem Repository Implementation
 * 
 * Implements IProblemRepository using Prisma Client.
 * Handles ID generation, idPath computation, and soft deletes.
 */

import { PrismaClient, ProblemStatus } from '@prisma/client';
import { IProblemRepository } from './problem-repository';
import { Problem, Status } from '../../../shared/types';
import { generateId } from '../utils/id-generator';
import { computeIdPath } from '../utils/id-path';

export class PrismaProblemRepository implements IProblemRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    workspaceId: string;
    organizationId: string;
    parentId?: string | null;
    problem?: string;
    objective?: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: Status;
    priority?: number;
    labels?: string[];
  }): Promise<Problem> {
    // Generate unique ID
    const id = await generateId();

    // Compute idPath
    const idPath = await computeIdPath(id, data.parentId ?? null, data.workspaceId);

    // Map Status enum from shared types to Prisma enum
    const prismaStatus = this.mapStatusToPrisma(data.status ?? Status.NotStarted);

    // Create the problem
    const problem = await this.prisma.problem.create({
      data: {
        id,
        idPath,
        workspaceId: data.workspaceId,
        organizationId: data.organizationId,
        parentId: data.parentId ?? null,
        problem: data.problem ?? '{"summary": "", "detail": ""}',
        objective: data.objective ?? '{"summary": "", "detail": ""}',
        keyResults: data.keyResults ?? '[]',
        actions: data.actions ?? '[]',
        blockers: data.blockers ?? '[]',
        status: prismaStatus,
        priority: data.priority ?? 0,
        labels: JSON.stringify(data.labels ?? []),
      },
    });

    return this.mapToProblem(problem);
  }

  async findById(id: string, organizationId: string): Promise<Problem | null> {
    const problem = await this.prisma.problem.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return problem ? this.mapToProblem(problem) : null;
  }

  async findByWorkspaceId(workspaceId: string, organizationId: string): Promise<Problem[]> {
    const problems = await this.prisma.problem.findMany({
      where: {
        workspaceId,
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return problems.map(p => this.mapToProblem(p));
  }

  async findByParentId(parentId: string, organizationId: string): Promise<Problem[]> {
    const problems = await this.prisma.problem.findMany({
      where: {
        parentId,
        organizationId,
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
    organizationId: string,
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

    // Verify problem belongs to organization
    const existing = await this.prisma.problem.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw new Error('Problem not found or does not belong to organization');
    }

    const problem = await this.prisma.problem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToProblem(problem);
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    const problem = await this.prisma.problem.findFirst({
      where: { 
        id,
        organizationId, // Ensure problem belongs to organization
      },
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
        where: { 
          id,
          organizationId, // Ensure problem belongs to organization
        },
        data: { deletedAt },
      }),
      // Cascade soft delete to all descendants using idPath prefix
      this.prisma.problem.updateMany({
        where: {
          idPath: {
            startsWith: descendantPrefix,
          },
          organizationId, // Only delete descendants in same organization
        },
        data: { deletedAt },
      }),
    ]);
  }

  async checkIdExists(id: string, workspaceId: string, organizationId: string): Promise<boolean> {
    const problem = await this.prisma.problem.findFirst({
      where: {
        id,
        workspaceId,
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
      select: {
        id: true,
      },
    });

    return problem !== null;
  }

  async move(
    id: string,
    organizationId: string,
    newParentId: string | null,
    afterProblemId: string | null
  ): Promise<Problem> {
    // Find the problem being moved
    const problem = await this.prisma.problem.findFirst({
      where: { 
        id,
        organizationId, // Ensure problem belongs to organization
      },
      select: {
        id: true,
        idPath: true,
        workspaceId: true,
        parentId: true,
        organizationId: true,
      },
    });

    if (!problem) {
      throw new Error('Problem not found');
    }

    if (problem.organizationId !== organizationId) {
      throw new Error('Problem does not belong to the specified organization');
    }

    const oldIdPath = problem.idPath;

    // Calculate new idPath
    let newIdPath: string;
    if (newParentId) {
      // Moving under a new parent - get parent's idPath
      const newParent = await this.prisma.problem.findFirst({
        where: { 
          id: newParentId,
          organizationId, // Ensure parent belongs to organization
        },
        select: { idPath: true, workspaceId: true, organizationId: true },
      });
      if (!newParent) {
        throw new Error('New parent not found');
      }
      if (newParent.organizationId !== organizationId) {
        throw new Error('New parent does not belong to the specified organization');
      }
      if (newParent.workspaceId !== problem.workspaceId) {
        throw new Error('Cannot move problem to a different workspace');
      }
      // Prevent moving a problem under itself or its descendants
      if (newParent.idPath.startsWith(oldIdPath + '-') || newParent.idPath === oldIdPath) {
        throw new Error('Cannot move a problem under itself or its descendants');
      }
      newIdPath = `${newParent.idPath}-${id}`;
    } else {
      // Moving to root level
      newIdPath = id;
    }

    // Calculate new priority based on afterProblemId
    let newPriority = 0;
    if (afterProblemId) {
      const afterProblem = await this.prisma.problem.findUnique({
        where: { id: afterProblemId },
        select: { priority: true },
      });
      if (afterProblem) {
        newPriority = afterProblem.priority + 1;
      }
    }

    // Get all descendants that need idPath updates
    const descendantPrefix = `${oldIdPath}-`;
    const descendants = await this.prisma.problem.findMany({
      where: {
        idPath: {
          startsWith: descendantPrefix,
        },
        organizationId, // Only update descendants in same organization
        deletedAt: null,
      },
      select: {
        id: true,
        idPath: true,
      },
    });

    // Calculate new idPaths for descendants
    const descendantUpdates = descendants.map((d) => ({
      id: d.id,
      // Replace the old prefix with the new one
      newIdPath: newIdPath + d.idPath.substring(oldIdPath.length),
    }));

    // Perform all updates in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update the moved problem
      await tx.problem.update({
        where: { id },
        data: {
          parentId: newParentId,
          idPath: newIdPath,
          priority: newPriority,
        },
      });

      // Update all descendants' idPaths
      for (const update of descendantUpdates) {
        await tx.problem.update({
          where: { id: update.id },
          data: { idPath: update.newIdPath },
        });
      }

      // Shift priorities of other siblings to make room
      // (problems at same level after the insertion point)
      if (newParentId !== null) {
        await tx.problem.updateMany({
          where: {
            parentId: newParentId,
            id: { not: id },
            priority: { gte: newPriority },
            deletedAt: null,
          },
          data: {
            priority: { increment: 1 },
          },
        });
      } else {
        // Root level siblings
        await tx.problem.updateMany({
          where: {
            parentId: null,
            workspaceId: problem.workspaceId,
            organizationId, // Only update siblings in same organization
            id: { not: id },
            priority: { gte: newPriority },
            deletedAt: null,
          },
          data: {
            priority: { increment: 1 },
          },
        });
      }
    });

    // Fetch and return the updated problem
    const updated = await this.prisma.problem.findFirst({
      where: { 
        id,
        organizationId, // Ensure problem belongs to organization
      },
    });

    if (!updated) {
      throw new Error('Problem not found after update');
    }

    return this.mapToProblem(updated);
  }

  async reorder(
    id: string,
    organizationId: string,
    position: 'top' | 'bottom' | number
  ): Promise<Problem> {
    // Find the problem being reordered
    const problem = await this.prisma.problem.findFirst({
      where: { 
        id,
        organizationId, // Ensure problem belongs to organization
      },
      select: {
        id: true,
        parentId: true,
        workspaceId: true,
        priority: true,
      },
    });

    if (!problem) {
      throw new Error('Problem not found');
    }

    // Get all siblings (problems at the same level), INCLUDING the problem being reordered
    const allSiblings = await this.prisma.problem.findMany({
      where: {
        parentId: problem.parentId,
        workspaceId: problem.workspaceId,
        organizationId, // Only get siblings in same organization
        deletedAt: null,
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        priority: true,
      },
    });

    // Remove the problem being reordered from the list
    const otherSiblings = allSiblings.filter(s => s.id !== id);
    
    // Determine the target index (0-based)
    let targetIndex = 0;
    
    if (position === 'top') {
      targetIndex = 0;
    } else if (position === 'bottom') {
      targetIndex = otherSiblings.length;
    } else {
      // position is a 1-based number
      targetIndex = position - 1;
      
      if (targetIndex < 0) {
        throw new Error('Position must be at least 1');
      }
      
      // Clamp to valid range
      if (targetIndex > otherSiblings.length) {
        targetIndex = otherSiblings.length;
      }
    }

    // Insert the problem at the target index
    const newOrder = [
      ...otherSiblings.slice(0, targetIndex),
      allSiblings.find(s => s.id === id)!,
      ...otherSiblings.slice(targetIndex),
    ];

    // Update all siblings with their new priorities
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < newOrder.length; i++) {
        await tx.problem.update({
          where: { id: newOrder[i].id },
          data: { priority: i },
        });
      }
    });

    // Fetch and return the updated problem
    const updated = await this.prisma.problem.findFirst({
      where: { 
        id,
        organizationId, // Ensure problem belongs to organization
      },
    });

    if (!updated) {
      throw new Error('Problem not found after reorder');
    }

    return this.mapToProblem(updated);
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
    workspaceId: string;
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
      workspaceId: problem.workspaceId,
      createdAt: problem.createdAt.toISOString(),
      updatedAt: problem.updatedAt.toISOString(),
      deletedAt: problem.deletedAt?.toISOString() ?? null,
    };
  }
}

