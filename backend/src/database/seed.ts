/**
 * Database Seeding Script
 * 
 * Seeds the database with a default workspace and sample problem chain
 * demonstrating POKRABS decomposition.
 * 
 * Can generate large amounts of test data with --large flag
 */

import { getPrismaClient } from './prisma-client';
import { getWorkspaceRepository, getProblemRepository, getViewRepository } from '../models/repository-factory';
import { Status } from '../../../shared/types';
import { generateId } from '../utils/id-generator';

// Sample data for generating varied problems
const problemTemplates = [
  { area: 'Performance', problems: ['System slow during peak hours', 'Database queries timing out', 'Page load times exceeding 3s', 'Memory usage growing unbounded', 'API response times degrading'] },
  { area: 'Security', problems: ['Outdated dependencies with CVEs', 'Missing rate limiting', 'Weak password policy', 'No encryption at rest', 'Insufficient access controls'] },
  { area: 'UX', problems: ['Users confused by navigation', 'Mobile experience poor', 'Forms lack validation feedback', 'Search results irrelevant', 'No dark mode support'] },
  { area: 'Infrastructure', problems: ['No automated backups', 'Single point of failure', 'Manual deployment process', 'No monitoring alerts', 'Logs not centralized'] },
  { area: 'Code Quality', problems: ['Test coverage below 50%', 'Technical debt accumulating', 'No code review process', 'Inconsistent style', 'Documentation outdated'] },
  { area: 'Business', problems: ['Customer churn increasing', 'Revenue growth stalled', 'High support costs', 'Long sales cycles', 'Poor user retention'] },
  { area: 'Team', problems: ['High developer turnover', 'Knowledge silos', 'Burnout increasing', 'Poor communication', 'Unclear priorities'] },
];

const objectiveTemplates = [
  'Improve {metric} by {percent}%',
  'Reduce {metric} to below {threshold}',
  'Implement {solution} for {area}',
  'Achieve {goal} across {scope}',
  'Optimize {system} for {criteria}',
];

const statusOptions = [Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved];

const labelSets = [
  ['high-priority', 'urgent'],
  ['technical', 'backend'],
  ['frontend', 'ui'],
  ['infrastructure', 'devops'],
  ['security', 'compliance'],
  ['ux', 'design'],
  ['business', 'strategy'],
  ['quick-win', 'low-effort'],
];

/**
 * Generate a random problem summary
 */
function generateProblemSummary(index: number): string {
  const template = problemTemplates[index % problemTemplates.length];
  const problem = template.problems[Math.floor(Math.random() * template.problems.length)];
  return `${template.area}: ${problem}`;
}

/**
 * Generate a random objective summary
 */
function generateObjectiveSummary(index: number): string {
  const templates = ['Fix', 'Resolve', 'Improve', 'Implement', 'Optimize', 'Reduce', 'Enhance'];
  const template = templates[index % templates.length];
  const area = problemTemplates[index % problemTemplates.length].area;
  return `${template} ${area.toLowerCase()} issue #${index}`;
}

/**
 * Generate random key results
 */
function generateKeyResults(): string[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(`Metric ${i + 1} reaches target threshold`);
  }
  return results;
}

/**
 * Generate random actions
 */
function generateActions(): string[] {
  const count = Math.floor(Math.random() * 4) + 1;
  const actions = [];
  for (let i = 0; i < count; i++) {
    actions.push(`Action step ${i + 1}`);
  }
  return actions;
}

/**
 * Generate random blockers
 */
function generateBlockers(status: Status): string[] {
  if (status !== Status.Blocked) return [];
  const count = Math.floor(Math.random() * 2) + 1;
  const blockers = [];
  for (let i = 0; i < count; i++) {
    blockers.push(`Blocker ${i + 1} preventing progress`);
  }
  return blockers;
}

/**
 * Seed the database with default workspace and sample problems
 */
export async function seedDatabase(options: { large?: boolean } = {}): Promise<void> {
  const prisma = getPrismaClient();
  const workspaceRepo = getWorkspaceRepository(prisma);
  const problemRepo = getProblemRepository(prisma);

  try {
    // Check if Default workspace already exists and delete it to allow reseeding
    const existingWorkspaces = await workspaceRepo.findAll();
    const defaultWorkspace = existingWorkspaces.find(w => w.name === 'Default Workspace');

    if (defaultWorkspace) {
      console.log('Default workspace exists, deleting to allow reseeding...');
      // Temporarily disable foreign key checks to delete all problems
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);
      await prisma.$executeRawUnsafe(`DELETE FROM problems WHERE workspaceId = ?`, defaultWorkspace.id);
      await prisma.$executeRawUnsafe(`DELETE FROM workspaces WHERE name = ?`, 'Default Workspace');
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
      console.log('Cleared existing Default workspace and problems');
    }

    // Create Default workspace
    const workspace = await workspaceRepo.create({
      id: await generateId(),
      name: 'Default Workspace',
    });

    console.log('Created Default workspace');

    // Create default view for the workspace
    const viewRepo = getViewRepository(prisma);
    await viewRepo.create({
      id: await generateId(),
      workspaceId: workspace.id,
      name: 'All Problems',
      filters: {
        selectedStatuses: [Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved],
        selectedLabels: [],
      },
      isDefault: true,
    });

    console.log('Created default view');

    // Create Active problems view (non-default)
    await viewRepo.create({
      id: await generateId(),
      workspaceId: workspace.id,
      name: 'Active problems',
      filters: {
        selectedStatuses: [Status.NotStarted, Status.InProgress, Status.Blocked],
        selectedLabels: [],
      },
      isDefault: false,
    });

    console.log('Created Active problems view');

    if (options.large) {
      // Generate large dataset for testing
      console.log('Generating large dataset...');
      const rootProblems = [];
      
      // Create 50 root problems
      for (let i = 0; i < 50; i++) {
        const status = statusOptions[i % statusOptions.length];
        const labels = labelSets[i % labelSets.length];
        
        const rootProblem = await problemRepo.create({
          workspaceId: workspace.id,
          parentId: null,
          problem: JSON.stringify({
            summary: generateProblemSummary(i),
            detail: `Detailed description of problem ${i}. This is a comprehensive explanation of what's wrong and why it matters.`,
          }),
          objective: JSON.stringify({
            summary: generateObjectiveSummary(i),
            detail: `Detailed objective for problem ${i}. This explains what we want to achieve and why.`,
          }),
          keyResults: JSON.stringify(generateKeyResults()),
          actions: JSON.stringify(generateActions()),
          blockers: JSON.stringify(generateBlockers(status)),
          status,
          priority: Math.floor(Math.random() * 100),
          labels,
        });
        rootProblems.push(rootProblem);
        
        if ((i + 1) % 10 === 0) {
          console.log(`Created ${i + 1} root problems...`);
        }
      }
      
      // Create 2-5 children for each root problem (100-250 total children)
      let totalChildren = 0;
      for (const rootProblem of rootProblems) {
        const childCount = Math.floor(Math.random() * 4) + 2; // 2-5 children
        
        for (let j = 0; j < childCount; j++) {
          const status = statusOptions[totalChildren % statusOptions.length];
          const labels = labelSets[totalChildren % labelSets.length];
          
          await problemRepo.create({
            workspaceId: workspace.id,
            parentId: rootProblem.id,
            problem: JSON.stringify({
              summary: `Sub-problem ${j + 1} of: ${JSON.parse(rootProblem.problem).summary}`,
              detail: `Detailed description of child problem ${totalChildren}.`,
            }),
            objective: JSON.stringify({
              summary: `Address sub-issue ${j + 1}`,
              detail: `Detailed objective for child problem ${totalChildren}.`,
            }),
            keyResults: JSON.stringify(generateKeyResults()),
            actions: JSON.stringify(generateActions()),
            blockers: JSON.stringify(generateBlockers(status)),
            status,
            priority: Math.floor(Math.random() * 100),
            labels,
          });
          
          totalChildren++;
        }
        
        if (totalChildren % 20 === 0) {
          console.log(`Created ${totalChildren} child problems...`);
        }
      }
      
      console.log(`Large dataset complete: ${rootProblems.length} root problems, ${totalChildren} child problems`);
    } else {
      // Create original small sample dataset
      // Root problem
      const rootProblem = await problemRepo.create({
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
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
        status: Status.Resolved,
        labels: ['support', 'technical'],
      });
      console.log(`Created problem: ${child3b.idPath}`);
    }

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
  // Check for --large flag
  const args = process.argv.slice(2);
  const large = args.includes('--large');
  
  console.log(large ? 'Seeding with large dataset...' : 'Seeding with small sample dataset...');
  
  seedDatabase({ large })
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

