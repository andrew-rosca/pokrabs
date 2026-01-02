# Database Seeding

This directory contains database seeding functionality for the POKRABS application.

## Overview

The seeding script (`seed.ts`) populates the database with sample problem data for development and testing purposes. It supports two modes:

1. **Small dataset** - Creates a sample problem hierarchy demonstrating POKRABS decomposition (6-7 problems)
2. **Large dataset** - Creates extensive test data for testing UI features like scrolling and filtering (200+ problems)

## Usage

### Small Dataset (Default)

Creates a small sample hierarchy with realistic POKRABS problems:

```bash
npm run db:seed
```

This creates:
- 1 root problem (Support team overwhelmed)
- 5-6 child/grandchild problems demonstrating problem decomposition
- Realistic problem descriptions, objectives, key results, actions, and blockers
- Various statuses (Actionable, Blocked, Resolved)

### Large Dataset (For Testing)

Creates a large dataset for testing UI features:

```bash
npm run db:seed:large
```

This creates:
- 50 root problems covering diverse areas:
  - Performance (slow systems, timeouts, degraded responses)
  - Security (vulnerabilities, access controls, encryption)
  - UX (navigation, mobile, forms, search)
  - Infrastructure (backups, deployment, monitoring)
  - Code Quality (tests, technical debt, documentation)
  - Business (churn, revenue, support costs)
  - Team (turnover, burnout, communication)
- 2-5 children for each root problem (150-250 child problems)
- Varied statuses (Actionable, In Progress, Blocked, Resolved)
- Diverse labels (high-priority, urgent, technical, frontend, backend, etc.)
- Realistic problem structures with summaries, details, objectives, key results, actions, and blockers

**Total: ~200-300 problems** - perfect for testing:
- Table scrolling performance
- Filtering and search
- Sorting by various columns
- Hierarchical display
- Bulk operations

## Features

### Reseeding

Both seeding modes automatically clear existing "Default Project" data before seeding, allowing you to reseed at any time:

```bash
npm run db:seed:large  # Clear and reseed
```

### Data Variety

The large dataset includes:

- **Statuses**: All 4 statuses distributed evenly
- **Labels**: 8 different label combinations (high-priority, technical, frontend, backend, infrastructure, security, ux, quick-win, low-effort, etc.)
- **Problem Areas**: 7 different domains with 5 problems each
- **Hierarchy**: Clear parent-child relationships
- **Realistic Content**: Problem descriptions, objectives, key results, actions, and blockers

### ID Generation

All problems use the LCG-based ID generator, producing human-readable IDs like:
- Root: `fg`, `z4`, `8n`
- Children: `mr-dw`, `qi-jo`, `nm-wz`
- Grandchildren: `mr-dw-a1`, `c4-dy-7m`

## Testing

The seeding functionality is fully tested in `seed.test.ts`:

```bash
npm test -- seed.test.ts
```

Tests verify:
- Small dataset creates correct number of problems
- Large dataset creates 150-300 problems
- Reseeding clears old data properly
- Problems have proper structure and variety
- Hierarchical relationships are maintained

## Implementation Details

### Problem Templates

The seed script uses templates to generate varied problems:

```typescript
const problemTemplates = [
  { area: 'Performance', problems: [...] },
  { area: 'Security', problems: [...] },
  // ... more areas
];
```

### Generation Functions

- `generateProblemSummary()` - Creates varied problem descriptions
- `generateObjectiveSummary()` - Creates objectives
- `generateKeyResults()` - Creates 1-3 key results
- `generateActions()` - Creates 1-4 action items
- `generateBlockers()` - Creates 1-2 blockers for blocked problems

### Performance

Seeding 214 problems takes approximately 2-3 seconds:
- 50 root problems created first
- Children created in batches with progress logging
- Foreign key constraints properly managed

## Use Cases

### Development
Use the small dataset to quickly populate the database with representative data:

```bash
npm run db:seed
```

### UI Testing
Use the large dataset to test UI features with realistic data volumes:

```bash
npm run db:seed:large
```

Then test:
- Scrolling through 200+ rows in the problems table
- Filtering by status, labels, or text
- Sorting by different columns
- Expanding/collapsing hierarchies
- Performance with many rows

### Demo
Use the small dataset for demos and presentations to show POKRABS methodology with clear, understandable examples.

## Next Steps

Potential enhancements:
- Add more problem templates for additional domains
- Support custom seed sizes (e.g., `--size=100`)
- Add seed profiles for specific scenarios
- Generate more realistic inter-problem relationships
- Add time-series data (created dates, progress over time)

