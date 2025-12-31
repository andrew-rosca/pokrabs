/**
 * Tests for ProblemsList Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemsList } from './ProblemsList';
import { fetchProblems, updateProblem } from '../services/api';
import { Problem, Status } from '../../../shared/types';

// Mock the API service
vi.mock('../services/api', () => ({
  fetchProblems: vi.fn(),
  updateProblem: vi.fn(),
}));

const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;
const mockUpdateProblem = updateProblem as ReturnType<typeof vi.fn>;

describe('ProblemsList', () => {
  const projectId = 'test-project-1';

  const mockProblems: Problem[] = [
    {
      id: 'i0',
      idPath: 'i0',
      problem: JSON.stringify({ summary: 'Problem 1', detail: 'Detail 1' }),
      objective: JSON.stringify({ summary: 'Objective 1', detail: 'Detail 1' }),
      keyResults: JSON.stringify(['KR1', 'KR2']),
      actions: JSON.stringify(['Action 1']),
      blockers: JSON.stringify([]),
      status: Status.NotStarted,
      votes: 0,
      priority: 0,
      labels: [],
      parentId: null,
      projectId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'i5',
      idPath: 'i0-i5',
      problem: JSON.stringify({ summary: 'Problem 2', detail: 'Detail 2' }),
      objective: JSON.stringify({ summary: 'Objective 2', detail: 'Detail 2' }),
      keyResults: JSON.stringify(['KR3']),
      actions: JSON.stringify(['Action 2', 'Action 3']),
      blockers: JSON.stringify(['Blocker 1']),
      status: Status.InProgress,
      votes: 5,
      priority: 10,
      labels: [],
      parentId: 'i0',
      projectId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchProblems.mockResolvedValue(mockProblems);
  });

  it('should render loading state initially', () => {
    mockFetchProblems.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ProblemsList projectId={projectId} />);
    expect(screen.getByText('Loading problems...')).toBeInTheDocument();
  });

  it('should render problems table', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Problem 2')).toBeInTheDocument();
    expect(screen.getByText('Objective 1')).toBeInTheDocument();
    expect(screen.getByText('Objective 2')).toBeInTheDocument();
  });

  it('should display hierarchical IDs with indentation', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('i0')).toBeInTheDocument();
    });
    
    expect(screen.getByText('i0-i5')).toBeInTheDocument();
  });

  it('should display status badges', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });
    
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should display votes', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display key results (newline-separated in edit mode)', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      // The component uses parseFieldForEdit which joins arrays with newlines
      // Check that the text content includes both values
      const keyResultsCell = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('KR1') && element?.textContent?.includes('KR2') || false;
      });
      expect(keyResultsCell.length).toBeGreaterThan(0);
    });
    
    expect(screen.getByText('KR3')).toBeInTheDocument();
  });

  it('should display actions (newline-separated in edit mode)', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      // Action 2 and Action 3 are in the same cell, separated by newline
      const actionCells = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Action 2') && element?.textContent?.includes('Action 3') || false;
      });
      expect(actionCells.length).toBeGreaterThan(0);
    });
  });

  it('should allow editing problem field', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], problem: JSON.stringify({ summary: 'Updated Problem', detail: 'Updated Detail' }) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    const problemCell = screen.getByText('Problem 1');
    await user.click(problemCell);
    
    const input = screen.getByDisplayValue('Problem 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Updated Problem');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        problem: expect.stringContaining('Updated Problem'),
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Updated Problem')).toBeInTheDocument();
    });
  });

  it('should allow editing objective field', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], objective: JSON.stringify({ summary: 'Updated Objective', detail: 'Updated Detail' }) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Objective 1')).toBeInTheDocument();
    });
    
    const objectiveCell = screen.getByText('Objective 1');
    await user.click(objectiveCell);
    
    const input = screen.getByDisplayValue('Objective 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Updated Objective');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        objective: expect.stringContaining('Updated Objective'),
      });
    });
  });

  it('should allow editing keyResults field (multiline)', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], keyResults: JSON.stringify(['KR1', 'KR2', 'KR3']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const cells = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('KR1') && element?.textContent?.includes('KR2') || false;
      });
      expect(cells.length).toBeGreaterThan(0);
    });
    
    // Find the editable-cell div directly (it has the cellRef)
    const editableCellDivs = document.querySelectorAll('.editable-cell');
    const keyResultsEditableCell = Array.from(editableCellDivs).find(div => {
      return div.textContent?.includes('KR1') && div.textContent?.includes('KR2');
    }) as HTMLElement;
    expect(keyResultsEditableCell).toBeTruthy();
    
    // Mock getBoundingClientRect for the cell
    const mockRect = {
      top: 100,
      left: 200,
      width: 300,
      height: 50,
      bottom: 150,
      right: 500,
      x: 200,
      y: 100,
      toJSON: () => {},
    };
    Object.defineProperty(keyResultsEditableCell, 'getBoundingClientRect', {
      value: () => mockRect,
      writable: true,
      configurable: true,
    });
    
    // Click the editable-cell div to enter edit mode
    await act(async () => {
      await user.click(keyResultsEditableCell);
    });
    
    // Wait for React to update and the textarea to appear
    // The overlay appears after cellRect is set in useEffect
    const textarea = await waitFor(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length === 0) {
        throw new Error('Textarea not found');
      }
      const ta = textareas[0] as HTMLTextAreaElement;
      if (!ta.value) {
        throw new Error('Textarea value not set');
      }
      return ta;
    }, { timeout: 3000 });
    
    // Verify textarea is visible and has the expected value
    expect(textarea).toBeVisible();
    expect(textarea.value).toContain('KR1');
    
    // Clear and type new content
    await user.clear(textarea);
    await user.type(textarea, 'KR1\nKR2\nKR3');
    await user.keyboard('{Meta>}{Enter}{/Meta}'); // Cmd+Enter to save
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        keyResults: JSON.stringify(['KR1', 'KR2', 'KR3']),
      });
    });
  });

  it('should allow editing actions field (multiline)', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[1], actions: JSON.stringify(['Action 2', 'Action 3', 'Action 4']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const cells = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Action 2') && element?.textContent?.includes('Action 3') || false;
      });
      expect(cells.length).toBeGreaterThan(0);
    });
    
    // Find the editable-cell div directly (it has the cellRef)
    const editableCellDivs = document.querySelectorAll('.editable-cell');
    const actionsEditableCell = Array.from(editableCellDivs).find(div => {
      return div.textContent?.includes('Action 2') && div.textContent?.includes('Action 3');
    }) as HTMLElement;
    expect(actionsEditableCell).toBeTruthy();
    
    // Mock getBoundingClientRect for the cell
    const mockRect = {
      top: 100,
      left: 200,
      width: 300,
      height: 50,
      bottom: 150,
      right: 500,
      x: 200,
      y: 100,
      toJSON: () => {},
    };
    Object.defineProperty(actionsEditableCell, 'getBoundingClientRect', {
      value: () => mockRect,
      writable: true,
      configurable: true,
    });
    
    // Click the editable-cell div to enter edit mode
    await act(async () => {
      await user.click(actionsEditableCell);
    });
    
    // Wait for React to update and the textarea to appear
    // The overlay appears after cellRect is set in useEffect
    const textarea = await waitFor(() => {
      const textareas = document.querySelectorAll('textarea');
      if (textareas.length === 0) {
        throw new Error('Textarea not found');
      }
      const ta = textareas[0] as HTMLTextAreaElement;
      if (!ta.value) {
        throw new Error('Textarea value not set');
      }
      return ta;
    }, { timeout: 3000 });
    
    // Verify textarea is visible and has the expected value
    expect(textarea).toBeVisible();
    expect(textarea.value).toContain('Action 2');
    
    // Clear and type new content
    await user.clear(textarea);
    await user.type(textarea, 'Action 2\nAction 3\nAction 4');
    await user.keyboard('{Meta>}{Enter}{/Meta}'); // Cmd+Enter to save
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i5', {
        actions: JSON.stringify(['Action 2', 'Action 3', 'Action 4']),
      });
    });
  });

  it('should allow editing blockers field (multiline)', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[1], blockers: JSON.stringify(['Blocker 1', 'Blocker 2']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Blocker 1')).toBeInTheDocument();
    });
    
    const blockersCell = screen.getByText('Blocker 1');
    await user.click(blockersCell);
    
    const textarea = screen.getByDisplayValue('Blocker 1') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'Blocker 1\nBlocker 2');
    await user.keyboard('{Meta>}{Enter}{/Meta}'); // Cmd+Enter to save
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i5', {
        blockers: JSON.stringify(['Blocker 1', 'Blocker 2']),
      });
    });
  });

  it('should handle update errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateProblem.mockRejectedValue(new Error('Update failed'));
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    const problemCell = screen.getByText('Problem 1');
    await user.click(problemCell);
    
    const input = screen.getByDisplayValue('Problem 1') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Updated Problem');
    await user.keyboard('{Enter}');
    
    // Should revert to original value on error
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should display error message on fetch failure', async () => {
    mockFetchProblems.mockRejectedValue(new Error('Failed to fetch'));
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no problems', async () => {
    mockFetchProblems.mockResolvedValue([]);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('No problems found.')).toBeInTheDocument();
    });
  });

  it('should sort problems hierarchically by idPath', async () => {
    const unsortedProblems: Problem[] = [
      {
        ...mockProblems[1], // i0-i5 (child)
        id: 'i5',
        idPath: 'i0-i5',
      },
      {
        ...mockProblems[0], // i0 (parent)
        id: 'i0',
        idPath: 'i0',
      },
    ];
    
    mockFetchProblems.mockResolvedValue(unsortedProblems);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // First row is header, second should be i0, third should be i0-i5
      expect(rows[1]).toHaveTextContent('i0');
      expect(rows[2]).toHaveTextContent('i0-i5');
    });
  });
});

