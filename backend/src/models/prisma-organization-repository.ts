/**
 * Prisma-based Organization Repository Implementation
 * 
 * Implements IOrganizationRepository using Prisma Client.
 */

import { PrismaClient } from '@prisma/client';
import { IOrganizationRepository, Organization } from './organization-repository';

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Organization | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    return organization ? this.mapToOrganization(organization) : null;
  }

  async findDefault(): Promise<Organization | null> {
    // For now, we'll use a fixed name to identify the default organization
    // In the future, we could add an isDefault flag to the schema
    const organization = await this.prisma.organization.findFirst({
      where: {
        name: 'Default Organization',
      },
    });

    return organization ? this.mapToOrganization(organization) : null;
  }

  async create(data: { id: string; name: string }): Promise<Organization> {
    const organization = await this.prisma.organization.create({
      data: {
        id: data.id,
        name: data.name,
      },
    });

    return this.mapToOrganization(organization);
  }

  /**
   * Map Prisma Organization model to Organization type
   */
  private mapToOrganization(organization: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): Organization {
    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}

