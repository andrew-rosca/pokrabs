/**
 * Sample test to verify test framework setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchProjects, fetchProblems } from './services/api';

// Mock the API service
vi.mock('./services/api', () => ({
  fetchProjects: vi.fn(),
  fetchProblems: vi.fn(),
}));

const mockFetchProjects = fetchProjects as ReturnType<typeof vi.fn>;
const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    mockFetchProjects.mockResolvedValue([
      { id: 'test-project', name: 'Test Project', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    mockFetchProblems.mockResolvedValue([]);
    
    render(<App />);
    
    // Wait for the app to load and show the project name
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

