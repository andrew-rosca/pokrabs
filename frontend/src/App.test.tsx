/**
 * Sample test to verify test framework setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchWorkspaces, fetchProblems } from './services/api';

// Mock the API service
vi.mock('./services/api', () => ({
  fetchWorkspaces: vi.fn(),
  fetchProblems: vi.fn(),
}));

const mockFetchWorkspaces = fetchWorkspaces as ReturnType<typeof vi.fn>;
const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    mockFetchWorkspaces.mockResolvedValue([
      { id: 'test-workspace', name: 'Test Workspace', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    mockFetchProblems.mockResolvedValue([]);
    
    render(<App />);
    
    // Wait for the app to load and show the workspace name
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

