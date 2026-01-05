/**
 * Prisma-based View Repository Implementation
 * 
 * Implements IViewRepository using Prisma Client.
 * Handles soft deletes automatically by filtering deletedAt IS NULL.
 */

import { PrismaClient } from '@prisma/client';
import { IViewRepository } from './view-repository';
import { View, ViewFilters } from '../../../shared/types';

export class PrismaViewRepository implements IViewRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: { 
    id: string; 
    workspaceId: string; 
    name: string; 
    filters: ViewFilters;
    isDefault?: boolean;
  }): Promise<View> {
    const view = await this.prisma.view.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        filters: JSON.stringify(data.filters),
        isDefault: data.isDefault ?? false,
      },
    });

    return this.mapToView(view);
  }

  async findById(id: string): Promise<View | null> {
    const view = await this.prisma.view.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return view ? this.mapToView(view) : null;
  }

  async findByWorkspaceId(workspaceId: string): Promise<View[]> {
    const views = await this.prisma.view.findMany({
      where: {
        workspaceId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: {
        lastUsedAt: 'desc', // Most recently used first
      },
    });

    return views.map(this.mapToView);
  }

  async findDefaultByWorkspaceId(workspaceId: string): Promise<View | null> {
    const view = await this.prisma.view.findFirst({
      where: {
        workspaceId,
        isDefault: true,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return view ? this.mapToView(view) : null;
  }

  async update(id: string, data: { 
    name?: string; 
    filters?: ViewFilters;
  }): Promise<View> {
    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.filters !== undefined) {
      updateData.filters = JSON.stringify(data.filters);
    }

    const view = await this.prisma.view.update({
      where: { id },
      data: updateData,
    });

    return this.mapToView(view);
  }

  async updateLastUsedAt(id: string): Promise<void> {
    await this.prisma.view.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.view.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Map Prisma View model to shared View type
   */
  private mapToView(view: {
    id: string;
    workspaceId: string;
    name: string;
    filters: string;
    lastUsedAt: Date;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): View {
    let filters: ViewFilters;
    try {
      filters = JSON.parse(view.filters);
    } catch {
      // Default to empty filters if parsing fails
      filters = { selectedStatuses: [], selectedLabels: [] };
    }

    return {
      id: view.id,
      workspaceId: view.workspaceId,
      name: view.name,
      filters,
      lastUsedAt: view.lastUsedAt.toISOString(),
      isDefault: view.isDefault,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
      deletedAt: view.deletedAt?.toISOString() ?? null,
    };
  }
}

