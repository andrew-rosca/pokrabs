/**
 * API Service Layer
 * 
 * Handles all communication with the backend API.
 */

import { Problem, Workspace, View, CreateViewRequest, UpdateViewRequest, ViewFilters } from '../../../shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch all workspaces
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch(`${API_URL}/api/workspaces`);
  if (!response.ok) {
    throw new Error(`Failed to fetch workspaces: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new workspace
 */
export async function createWorkspace(name: string): Promise<Workspace> {
  const response = await fetch(`${API_URL}/api/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    let errorMessage = `Failed to create workspace: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If response is not JSON, use the status text
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: { name?: string }
): Promise<Workspace> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    let errorMessage = `Failed to update workspace: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Update lastUsedAt timestamp for a workspace
 */
export async function useWorkspace(workspaceId: string): Promise<Workspace> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/use`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error(`Failed to update workspace usage: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a workspace (soft delete)
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    let errorMessage = `Failed to delete workspace: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
}

/**
 * Fetch all problems for a workspace
 */
export async function fetchProblems(workspaceId: string): Promise<Problem[]> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/problems`);
  if (!response.ok) {
    throw new Error(`Failed to fetch problems: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single problem by ID
 */
export async function fetchProblem(problemId: string): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch problem: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new problem
 */
export async function createProblem(
  workspaceId: string,
  problem: {
    problem: string;
    objective: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: string;
    priority?: number;
    labels?: string[];
    parentId?: string | null;
  }
): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/problems`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(problem),
  });
  if (!response.ok) {
    let errorMessage = `Failed to create problem: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If response is not JSON, use the status text
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Update a problem
 */
export async function updateProblem(
  problemId: string,
  updates: {
    problem?: string;
    objective?: string;
    keyResults?: string;
    actions?: string;
    blockers?: string;
    status?: string;
    votes?: number;
    priority?: number;
    labels?: string[];
  }
): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update problem: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a problem (soft delete)
 */
export async function deleteProblem(problemId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    let errorMessage = `Failed to delete problem: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
}

/**
 * Move a problem to a new parent and/or position
 * @param problemId - The problem ID to move
 * @param newParentId - The new parent ID (null for root level)
 * @param afterProblemId - Insert after this sibling (null means first among siblings)
 */
export async function moveProblem(
  problemId: string,
  newParentId: string | null,
  afterProblemId: string | null
): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}/move`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newParentId, afterProblemId }),
  });
  if (!response.ok) {
    let errorMessage = `Failed to move problem: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Reorder a problem within its current parent to a specific position
 * @param problemId - The problem ID to reorder
 * @param position - Target position: 'top' (first), 'bottom' (last), or a number (1-based index)
 */
export async function reorderProblem(
  problemId: string,
  position: 'top' | 'bottom' | number
): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}/reorder`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ position }),
  });
  if (!response.ok) {
    let errorMessage = `Failed to reorder problem: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Fetch all views for a workspace
 */
export async function fetchViews(workspaceId: string): Promise<View[]> {
  const response = await fetch(`${API_URL}/api/views/workspaces/${workspaceId}/views`);
  if (!response.ok) {
    throw new Error(`Failed to fetch views: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single view by ID
 */
export async function fetchView(viewId: string): Promise<View> {
  const response = await fetch(`${API_URL}/api/views/${viewId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch view: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new view
 */
export async function createView(workspaceId: string, view: CreateViewRequest): Promise<View> {
  const response = await fetch(`${API_URL}/api/views/workspaces/${workspaceId}/views`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(view),
  });
  if (!response.ok) {
    let errorMessage = `Failed to create view: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Update a view
 */
export async function updateView(viewId: string, updates: UpdateViewRequest): Promise<View> {
  const response = await fetch(`${API_URL}/api/views/${viewId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    let errorMessage = `Failed to update view: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Update lastUsedAt timestamp for a view
 */
export async function useView(viewId: string): Promise<View> {
  const response = await fetch(`${API_URL}/api/views/${viewId}/use`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error(`Failed to update view usage: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete a view (soft delete)
 */
export async function deleteView(viewId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/views/${viewId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    let errorMessage = `Failed to delete view: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
}

