/**
 * API Service Layer
 * 
 * Handles all communication with the backend API.
 */

import { Problem, Workspace, View, CreateViewRequest, UpdateViewRequest, ViewFilters, VoteStatusResponse, VoteResponse, VoterInfo } from '../../../shared/types';

/**
 * Custom error for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// In production (when served from same origin), use relative URLs
// In development, use relative URLs to go through Vite proxy (which forwards to localhost:3001)
// VITE_API_URL is set by Docker build to empty string for production
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Fetch all workspaces
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch(`${API_URL}/api/workspaces`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access workspaces');
    }
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
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to create workspace');
    }
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
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to update workspace');
    }
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
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required');
    }
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
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to delete workspace');
    }
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
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/problems`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access problems');
    }
    throw new Error(`Failed to fetch problems: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single problem by ID
 */
export async function fetchProblem(problemId: string): Promise<Problem> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access problem');
    }
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
    credentials: 'include',
    body: JSON.stringify(problem),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to create problem');
    }
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
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to save changes');
    }
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
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to delete problem');
    }
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
    credentials: 'include',
    body: JSON.stringify({ newParentId, afterProblemId }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to move problem');
    }
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
    credentials: 'include',
    body: JSON.stringify({ position }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to reorder problem');
    }
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
  const response = await fetch(`${API_URL}/api/views/workspaces/${workspaceId}/views`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access views');
    }
    throw new Error(`Failed to fetch views: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch a single view by ID
 */
export async function fetchView(viewId: string): Promise<View> {
  const response = await fetch(`${API_URL}/api/views/${viewId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access view');
    }
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
    credentials: 'include',
    body: JSON.stringify(view),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to create view');
    }
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
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to update view');
    }
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
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required');
    }
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
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to delete view');
    }
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

// =============================================================================
// Voting API
// =============================================================================

/**
 * Get the current user's vote status in a workspace
 * Returns available votes, max votes, and map of user's votes per problem
 */
export async function fetchVoteStatus(workspaceId: string): Promise<VoteStatusResponse> {
  const response = await fetch(`${API_URL}/api/workspaces/${workspaceId}/votes`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access vote status');
    }
    throw new Error(`Failed to fetch vote status: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Add a vote to a problem
 * Returns updated problem, user's vote count, available votes, and voters list
 */
export async function addVote(problemId: string): Promise<VoteResponse> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}/vote`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to vote');
    }
    let errorMessage = `Failed to add vote: ${response.statusText}`;
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
 * Remove a vote from a problem
 * Returns updated problem, user's vote count, available votes, and voters list
 */
export async function removeVote(problemId: string): Promise<VoteResponse> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}/vote`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to vote');
    }
    let errorMessage = `Failed to remove vote: ${response.statusText}`;
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
 * Get the list of voters for a problem
 */
export async function fetchVoters(problemId: string): Promise<VoterInfo[]> {
  const response = await fetch(`${API_URL}/api/problems/${problemId}/voters`, {
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthenticationError('Authentication required to access voters');
    }
    throw new Error(`Failed to fetch voters: ${response.statusText}`);
  }
  return response.json();
}
