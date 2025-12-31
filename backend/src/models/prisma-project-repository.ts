/**
 * Prisma-based Project Repository Implementation
 * 
 * Implements IProjectRepository using Prisma Client.
 * Handles soft deletes automatically by filtering deletedAt IS NULL.
 */

import { PrismaClient } from '@prisma/client';
import { IProjectRepository } from './project-repository';
import { Project } from '../../../shared/types';

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: { id: string; name: string }): Promise<Project> {
    const project = await this.prisma.project.create({
      data: {
        id: data.id,
        name: data.name,
      },
    });

    return this.mapToProject(project);
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted
      },
    });

    return project ? this.mapToProject(project) : null;
  }

  async findAll(): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects.map(this.mapToProject);
  }

  async update(id: string, data: { name?: string }): Promise<Project> {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    return this.mapToProject(project);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Map Prisma Project model to shared Project type
   */
  private mapToProject(project: {
    id: string;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
  }): Project {
    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      deletedAt: project.deletedAt?.toISOString() ?? null,
    };
  }
}

