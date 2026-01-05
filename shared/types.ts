// Shared TypeScript types between frontend and backend

export enum Status {
  NotStarted = 'Actionable',
  InProgress = 'In Progress',
  Blocked = 'Blocked',
  Resolved = 'Resolved',
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface Problem {
  id: string;
  idPath: string;
  problem: string;
  objective: string;
  keyResults: string;
  actions: string;
  blockers: string;
  status: Status;
  votes: number;
  priority: number;
  labels: string[];
  parentId: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateProblemRequest {
  problem: string;
  objective: string;
  keyResults?: string;
  actions?: string;
  blockers?: string;
  status?: Status;
  priority?: number;
  labels?: string[];
  parentId?: string | null;
}

export interface UpdateProblemRequest {
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

export interface ViewFilters {
  selectedStatuses: string[];
  selectedLabels: string[];
}

export interface View {
  id: string;
  workspaceId: string;
  name: string;
  filters: ViewFilters;
  lastUsedAt: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateViewRequest {
  name: string;
  filters: ViewFilters;
  isDefault?: boolean;
}

export interface UpdateViewRequest {
  name?: string;
  filters?: ViewFilters;
}

