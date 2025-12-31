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

