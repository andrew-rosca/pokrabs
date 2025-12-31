/**
 * Database Seeding Script
 * 
 * Seeds the database with a default project and sample problem chain
 * demonstrating POKRABS decomposition.
 */

import { getPrismaClient } from './prisma-client';
import { getProjectRepository, getProblemRepository } from '../models/repository-factory';
import { Status } from '../../../shared/types';

/**
 * Seed the database with default project and sample problems
 */
export async function seedDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  const projectRepo = getProjectRepository(prisma);
  const problemRepo = getProblemRepository(prisma);

  try {
    // Check if Default project already exists and delete it to allow reseeding
    const existingProjects = await projectRepo.findAll();
    const defaultProject = existingProjects.find(p => p.name === 'Default');

    if (defaultProject) {
      console.log('Default project exists, deleting to allow reseeding...');
      // Temporarily disable foreign key checks to delete all problems
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);
      await prisma.$executeRawUnsafe(`DELETE FROM problems WHERE projectId = ?`, defaultProject.id);
      await prisma.$executeRawUnsafe(`DELETE FROM projects WHERE name = ?`, 'Default');
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
      console.log('Cleared existing Default project and problems');
    }

    // Create Default project
    const project = await projectRepo.create({
      id: 'default-project-1',
      name: 'Default',
    });

    console.log('Created Default project');

    // Seed problems - IDs will be generated automatically by the repository
    // Create problems in order (parents before children)
    
    // Root problem
    const rootProblem = await problemRepo.create({
      projectId: project.id,
      parentId: null,
      problem: JSON.stringify({
        summary: 'Support team is overwhelmed',
        detail: 'Support team is overwhelmed',
      }),
      objective: JSON.stringify({
        summary: 'Reduce support ticket volume',
        detail: 'Reduce support ticket volume',
      }),
      keyResults: JSON.stringify(['< 500 tickets/month (currently 1200/month)']),
      actions: JSON.stringify([]),
      blockers: JSON.stringify(['We don\'t know what\'s causing the tickets']),
      status: Status.Blocked,
      labels: ['support', 'high-priority'],
    });
    console.log(`Created root problem: ${rootProblem.idPath}`);

    // Child 1: Analyze ticket patterns
    const child1 = await problemRepo.create({
      projectId: project.id,
      parentId: rootProblem.id,
      problem: JSON.stringify({
        summary: 'We don\'t know root causes of tickets',
        detail: 'We don\'t know root causes of tickets',
      }),
      objective: JSON.stringify({
        summary: 'Analyze support ticket patterns',
        detail: 'Analyze support ticket patterns',
      }),
      keyResults: JSON.stringify(['Root cause identified for top 80% of ticket volume']),
      actions: JSON.stringify(['Categorize last 3 months of tickets', 'Generate Pareto analysis']),
      blockers: JSON.stringify(['Tickets aren\'t categorized consistently']),
      status: Status.Blocked,
      labels: ['support', 'analytics'],
    });
    console.log(`Created problem: ${child1.idPath}`);

    // Child 2 of child1: Implement categorization
    const child2a = await problemRepo.create({
      projectId: project.id,
      parentId: child1.id,
      problem: JSON.stringify({
        summary: 'Tickets aren\'t categorized',
        detail: 'Tickets aren\'t categorized',
      }),
      objective: JSON.stringify({
        summary: 'Implement ticket categorization',
        detail: 'Implement ticket categorization',
      }),
      keyResults: JSON.stringify(['> 90% of new tickets properly categorized']),
      actions: JSON.stringify(['Create category taxonomy', 'Train support team', 'Add required fields']),
      blockers: JSON.stringify(['We don\'t know what categories to use']),
      status: Status.Blocked,
      labels: ['support', 'process'],
    });
    console.log(`Created problem: ${child2a.idPath}`);

    // Child 3 of child2a: Define taxonomy (actionable - no blockers)
    const child3a = await problemRepo.create({
      projectId: project.id,
      parentId: child2a.id,
      problem: JSON.stringify({
        summary: 'Don\'t know what ticket categories to use',
        detail: 'Don\'t know what ticket categories to use',
      }),
      objective: JSON.stringify({
        summary: 'Define ticket taxonomy',
        detail: 'Define ticket taxonomy',
      }),
      keyResults: JSON.stringify(['Category system that covers 95%+ of historical tickets']),
      actions: JSON.stringify(['Analyze 500 recent tickets', 'Draft category structure', 'Validate with support team']),
      blockers: JSON.stringify([]),
      status: Status.NotStarted,
      labels: ['support', 'process'],
    });
    console.log(`Created problem: ${child3a.idPath}`);

    // Child 4 of child1: Retroactively categorize
    const child2b = await problemRepo.create({
      projectId: project.id,
      parentId: child1.id,
      problem: JSON.stringify({
        summary: 'Historical tickets lack categories',
        detail: 'Historical tickets lack categories',
      }),
      objective: JSON.stringify({
        summary: 'Retroactively categorize tickets',
        detail: 'Retroactively categorize tickets',
      }),
      keyResults: JSON.stringify(['Last 1000 tickets categorized']),
      actions: JSON.stringify(['Write categorization script', 'Manual review edge cases']),
      blockers: JSON.stringify(['We can\'t access tickets via API']),
      status: Status.Blocked,
      labels: ['support', 'technical'],
    });
    console.log(`Created problem: ${child2b.idPath}`);

    // Child 5 of child2b: Get API access (actionable - no blockers)
    const child3b = await problemRepo.create({
      projectId: project.id,
      parentId: child2b.id,
      problem: JSON.stringify({
        summary: 'No API access to support system',
        detail: 'No API access to support system',
      }),
      objective: JSON.stringify({
        summary: 'Get support system API access',
        detail: 'Get support system API access',
      }),
      keyResults: JSON.stringify(['API credentials with read/write access to tickets']),
      actions: JSON.stringify(['Request API access from support platform', 'Set up authentication']),
      blockers: JSON.stringify([]),
      status: Status.NotStarted,
      labels: ['support', 'technical'],
    });
    console.log(`Created problem: ${child3b.idPath}`);

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

