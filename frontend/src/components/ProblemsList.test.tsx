/**
 * Tests for ProblemsList Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemsList } from './ProblemsList';
import { fetchProblems, updateProblem, createProblem } from '../services/api';
import { Problem, Status } from '../../../shared/types';

// Mock the API service
vi.mock('../services/api', () => ({
  fetchProblems: vi.fn(),
  updateProblem: vi.fn(),
  createProblem: vi.fn(),
}));

const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;
const mockUpdateProblem = updateProblem as ReturnType<typeof vi.fn>;
const mockCreateProblem = createProblem as ReturnType<typeof vi.fn>;

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
    mockCreateProblem.mockResolvedValue({
      id: 'new-id',
      idPath: 'new-id',
      problem: JSON.stringify({ summary: 'New problem', detail: 'New problem' }),
      objective: JSON.stringify({ summary: 'New objective', detail: 'New objective' }),
      keyResults: JSON.stringify([]),
      actions: JSON.stringify([]),
      blockers: JSON.stringify([]),
      status: Status.NotStarted,
      votes: 0,
      priority: 0,
      labels: [],
      parentId: null,
      projectId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
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

  it('should display status dropdowns', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
    
    // Verify status values are present in dropdowns
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const notStartedSelect = selects.find(s => s.value === Status.NotStarted);
    const inProgressSelect = selects.find(s => s.value === Status.InProgress);
    
    expect(notStartedSelect).toBeInTheDocument();
    expect(inProgressSelect).toBeInTheDocument();
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

  it('should allow changing status via dropdown', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], status: Status.InProgress };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
    
    // Find the status dropdown for the first problem (i0)
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const statusSelect = selects.find(
      select => select.value === Status.NotStarted
    ) as HTMLSelectElement;
    
    expect(statusSelect).toBeInTheDocument();
    
    // Change status to In Progress
    await user.selectOptions(statusSelect, Status.InProgress);
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        status: Status.InProgress,
      });
    });
    
    // Verify UI updated
    await waitFor(() => {
      expect(statusSelect.value).toBe(Status.InProgress);
    });
  });

  it('should handle status change errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateProblem.mockRejectedValue(new Error('Update failed'));
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
    
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const statusSelect = selects.find(
      select => select.value === Status.NotStarted
    ) as HTMLSelectElement;
    
    await user.selectOptions(statusSelect, Status.InProgress);
    
    // Should revert to original status on error
    await waitFor(() => {
      expect(statusSelect.value).toBe(Status.NotStarted);
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should allow incrementing votes on click', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], votes: 1 };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
    
    // Find the vote button
    const voteButton = screen.getByText('0').closest('button');
    expect(voteButton).toBeInTheDocument();
    
    // Click to increment
    await user.click(voteButton!);
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        votes: 1,
      });
    });
    
    // Verify UI updated optimistically
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should handle vote increment errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateProblem.mockRejectedValue(new Error('Update failed'));
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
    
    const voteButton = screen.getByText('0').closest('button');
    await user.click(voteButton!);
    
    // Should revert to original vote count on error
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  describe('Create Problem', () => {
    it('should create a new problem when + button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      // Find the + button in the first row's actions panel
      // The button should be in a row-actions-panel
      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1]; // Skip header row
      
      // Hover over the row to show the actions panel
      await user.hover(firstDataRow);
      
      // Find the + button
      const createButtons = screen.getAllByTitle(/Insert new problem/i);
      expect(createButtons.length).toBeGreaterThan(0);
      
      // Click the first + button (creates child of first problem)
      await user.click(createButtons[0]);
      
      // Verify createProblem was called with correct parameters
      await waitFor(() => {
        expect(mockCreateProblem).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({
            problem: JSON.stringify({ summary: 'New problem', detail: 'New problem' }),
            objective: JSON.stringify({ summary: 'New objective', detail: 'New objective' }),
            status: 'Actionable', // Status.NotStarted serializes to 'Actionable'
            parentId: 'i0', // Should be child of first problem
          })
        );
      });
      
      // Verify fetchProblems was called again to refresh the list
      expect(mockFetchProblems).toHaveBeenCalledTimes(2); // Once on mount, once after create
    });

    it('should create a top-level problem when + button is clicked on bottom row', async () => {
      const user = userEvent.setup();
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      // Find the + button in the bottom insert row
      const insertButtons = screen.getAllByTitle(/Insert new problem/i);
      const bottomButton = insertButtons[insertButtons.length - 1]; // Last button is for top-level
      
      await user.click(bottomButton);
      
      // Verify createProblem was called with null parentId
      await waitFor(() => {
        expect(mockCreateProblem).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({
            parentId: null, // Top-level problem
          })
        );
      });
    });

    it('should handle create problem error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateProblem.mockRejectedValue(new Error('Failed to create problem: Bad Request'));
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      await user.hover(firstDataRow);
      
      const createButtons = screen.getAllByTitle(/Insert new problem/i);
      await user.click(createButtons[0]);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      });
      
      expect(mockCreateProblem).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});

