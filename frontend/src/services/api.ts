/**
 * API Service Layer
 * 
 * Handles all communication with the backend API.
 */

import { Problem, Project } from '../../../shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch all projects
 */
export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/api/projects`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all problems for a project
 */
export async function fetchProblems(projectId: string): Promise<Problem[]> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/problems`);
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
  projectId: string,
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
  const response = await fetch(`${API_URL}/api/projects/${projectId}/problems`, {
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

