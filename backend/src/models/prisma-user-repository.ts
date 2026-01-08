/**
 * Prisma-based User Repository Implementation
 * 
 * Implements IUserRepository using Prisma Client.
 */

import { PrismaClient } from '@prisma/client';
import { IUserRepository, User } from './user-repository';

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapToUser(user) : null;
  }

  async findByAuthId(authId: string, authProvider: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        authId_authProvider: {
          authId,
          authProvider,
        },
      },
    });

    return user ? this.mapToUser(user) : null;
  }

  async create(data: {
    id: string;
    organizationId: string;
    authId?: string | null;
    authProvider?: string | null;
    email: string;
    name: string;
  }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        authId: data.authId ?? null,
        authProvider: data.authProvider ?? null,
        email: data.email,
        name: data.name,
      },
    });

    return this.mapToUser(user);
  }

  async findOrCreateByAuthId(data: {
    organizationId: string;
    authId: string;
    authProvider: string;
    email: string;
    name: string;
  }): Promise<User> {
    // Try to find existing user
    const existing = await this.findByAuthId(data.authId, data.authProvider);
    if (existing) {
      return existing;
    }

    // Create new user with random UUID
    const { randomUUID } = await import('crypto');
    return this.create({
      id: randomUUID(),
      organizationId: data.organizationId,
      authId: data.authId,
      authProvider: data.authProvider,
      email: data.email,
      name: data.name,
    });
  }

  /**
   * Map Prisma User model to User type
   */
  private mapToUser(user: {
    id: string;
    organizationId: string;
    authId: string | null;
    authProvider: string | null;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      organizationId: user.organizationId,
      authId: user.authId,
      authProvider: user.authProvider,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

