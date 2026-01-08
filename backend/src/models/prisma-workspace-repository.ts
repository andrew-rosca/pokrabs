/**
 * Prisma-based Workspace Repository Implementation
 * 
 * Implements IWorkspaceRepository using Prisma Client.
 * Handles soft deletes automatically by filtering deletedAt IS NULL.
 */

import { PrismaClient } from '@prisma/client';
import { IWorkspaceRepository } from './workspace-repository';
import { Workspace } from '../../../shared/types';

export class PrismaWorkspaceRepository implements IWorkspaceRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: { id: string; organizationId: string; name: string }): Promise<Workspace> {
    const workspace = await this.prisma.workspace.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
      },
    });

    return this.mapToWorkspace(workspace as any);
  }

  async findById(id: string, organizationId: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return workspace ? this.mapToWorkspace(workspace as any) : null;
  }

  async findAll(organizationId: string): Promise<Workspace[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        organizationId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: {
        lastUsedAt: 'desc', // Most recently used first
      } as any,
    });

    return workspaces.map((w: any) => this.mapToWorkspace(w));
  }

  async update(id: string, organizationId: string, data: { name?: string }): Promise<Workspace> {
    const workspace = await this.prisma.workspace.update({
      where: { 
        id,
        organizationId, // Ensure workspace belongs to organization
      },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    return this.mapToWorkspace(workspace as any);
  }

  async updateLastUsedAt(id: string, organizationId: string): Promise<void> {
    await this.prisma.workspace.update({
      where: { 
        id,
        organizationId, // Ensure workspace belongs to organization
      },
      data: {
        lastUsedAt: new Date(),
      } as any,
    });
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.prisma.workspace.update({
      where: { 
        id,
        organizationId, // Ensure workspace belongs to organization
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Map Prisma Workspace model to shared Workspace type
   */
  private mapToWorkspace(workspace: {
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt: Date;
    deletedAt: Date | null;
  }): Workspace {
    return {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt.toISOString(),
      lastUsedAt: workspace.lastUsedAt.toISOString(),
      deletedAt: workspace.deletedAt?.toISOString() ?? null,
    };
  }
}

