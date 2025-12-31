// Shared TypeScript types between frontend and backend

export enum Status {
  NotStarted = 'Actionable',
  InProgress = 'In Progress',
  Blocked = 'Blocked',
  Resolved = 'Resolved',
}

export interface Project {
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
  projectId: string;
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

