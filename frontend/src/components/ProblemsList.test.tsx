/**
 * Tests for ProblemsList Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProblemsList } from './ProblemsList';
import { fetchProblems, updateProblem, createProblem, deleteProblem } from '../services/api';
import { Problem, Status } from '../../../shared/types';

// Mock the API service
vi.mock('../services/api', () => ({
  fetchProblems: vi.fn(),
  updateProblem: vi.fn(),
  createProblem: vi.fn(),
  deleteProblem: vi.fn(),
}));

const mockFetchProblems = fetchProblems as ReturnType<typeof vi.fn>;
const mockUpdateProblem = updateProblem as ReturnType<typeof vi.fn>;
const mockCreateProblem = createProblem as ReturnType<typeof vi.fn>;
const mockDeleteProblem = deleteProblem as ReturnType<typeof vi.fn>;

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
      problem: JSON.stringify({ summary: 'New problem', detail: '' }),
      objective: JSON.stringify({ summary: 'New objective', detail: '' }),
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

  it('should display key results one per line', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      // ListCell displays items one per line
      expect(screen.getByText('KR1')).toBeInTheDocument();
      expect(screen.getByText('KR2')).toBeInTheDocument();
      expect(screen.getByText('KR3')).toBeInTheDocument();
    });
  });

  it('should display actions one per line', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      // ListCell displays items one per line
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('Action 3')).toBeInTheDocument();
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
    
    // Click on the problem cell to open the editor
    const problemCell = screen.getByText('Problem 1');
    await user.click(problemCell);
    
    // Wait for the editor to appear and find the summary textarea
    const summaryTextarea = await waitFor(() => {
      return screen.getByPlaceholderText('Summary') as HTMLTextAreaElement;
    });
    
    // Update the summary
    await user.clear(summaryTextarea);
    await user.type(summaryTextarea, 'Updated Problem');
    
    // Click the save button
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        problem: expect.stringContaining('Updated Problem'),
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Updated Problem')).toBeInTheDocument();
    });
  });

  it('should show expand button when detail exists', async () => {
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    // Should have expand buttons (one for problem, one for objective, for each problem)
    // Each problem has both problem and objective fields with detail
    await waitFor(() => {
      const expandButtons = screen.getAllByTitle('Expand detail');
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  it('should not show expand button when detail is empty', async () => {
    const problemWithoutDetail = {
      ...mockProblems[0],
      problem: JSON.stringify({ summary: 'Problem 1', detail: '' }),
      objective: JSON.stringify({ summary: 'Objective 1', detail: '' }),
    };
    mockFetchProblems.mockResolvedValue([problemWithoutDetail]);
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    // Should not have expand buttons (both problem and objective have empty detail)
    const expandButtons = screen.queryAllByTitle('Expand detail');
    expect(expandButtons.length).toBe(0);
  });

  it('should expand and show detail when expand button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    // Get all expand buttons and click the first one (for the problem field)
    const expandButtons = await waitFor(() => {
      const buttons = screen.getAllByTitle('Expand detail');
      expect(buttons.length).toBeGreaterThan(0);
      return buttons;
    });
    
    await user.click(expandButtons[0]);
    
    // Detail should be visible (Detail 1 from mockProblems[0])
    await waitFor(() => {
      expect(screen.getByText('Detail 1')).toBeInTheDocument();
    });
    
    // Button should now show collapse
    expect(screen.getByTitle('Collapse detail')).toBeInTheDocument();
  });

  it('should collapse and hide detail when collapse button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<ProblemsList projectId={projectId} />);
    
    await waitFor(() => {
      expect(screen.getByText('Problem 1')).toBeInTheDocument();
    });
    
    // Expand first - get all expand buttons and click the first one
    const expandButtons = await waitFor(() => {
      const buttons = screen.getAllByTitle('Expand detail');
      expect(buttons.length).toBeGreaterThan(0);
      return buttons;
    });
    
    await user.click(expandButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Detail 1')).toBeInTheDocument();
    });
    
    // Collapse
    const collapseButton = screen.getByTitle('Collapse detail');
    await user.click(collapseButton);
    
    // Detail should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Detail 1')).not.toBeInTheDocument();
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
    
    // Click on the objective cell to open the editor
    const objectiveCell = screen.getByText('Objective 1');
    await user.click(objectiveCell);
    
    // Wait for the editor to appear and find the summary textarea
    const summaryTextarea = await waitFor(() => {
      return screen.getByPlaceholderText('Summary') as HTMLTextAreaElement;
    });
    
    // Update the summary
    await user.clear(summaryTextarea);
    await user.type(summaryTextarea, 'Updated Objective');
    
    // Click the save button
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        objective: expect.stringContaining('Updated Objective'),
      });
    });
  });

  it('should allow editing keyResults field via ListEditor', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[0], keyResults: JSON.stringify(['KR1', 'KR2', 'KR3']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    // Wait for the list cell items to appear
    await waitFor(() => {
      expect(screen.getAllByText('KR1').length).toBeGreaterThan(0);
    });
    
    // Find and click the list cell to open ListEditor (get the first KR1 element's parent cell)
    const listCell = screen.getAllByText('KR1')[0].closest('.list-cell') as HTMLElement;
    await user.click(listCell);
    
    // Wait for ListEditor dialog to appear
    const dialog = await waitFor(() => {
      return screen.getByRole('dialog', { name: 'Key Results' });
    });
    expect(dialog).toBeInTheDocument();
    
    // Add a new item via the blank row
    const addItemInput = screen.getByLabelText(/Add item/i);
    await user.click(addItemInput);
    await user.type(addItemInput, 'KR3');
    await user.keyboard('{Enter}');
    
    // Click Save button
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i0', {
        keyResults: JSON.stringify(['KR1', 'KR2', 'KR3']),
      });
    });
  });

  it('should allow editing actions field via ListEditor', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[1], actions: JSON.stringify(['Action 2', 'Action 3', 'Action 4']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    // Wait for the list cell items to appear
    await waitFor(() => {
      expect(screen.getAllByText('Action 2').length).toBeGreaterThan(0);
    });
    
    // Find and click the list cell to open ListEditor
    const listCell = screen.getAllByText('Action 2')[0].closest('.list-cell') as HTMLElement;
    await user.click(listCell);
    
    // Wait for ListEditor dialog to appear
    const dialog = await waitFor(() => {
      return screen.getByRole('dialog', { name: 'Actions' });
    });
    expect(dialog).toBeInTheDocument();
    
    // Add a new item via the blank row
    const addItemInput = screen.getByLabelText(/Add item/i);
    await user.click(addItemInput);
    await user.type(addItemInput, 'Action 4');
    await user.keyboard('{Enter}');
    
    // Click Save button
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
    await waitFor(() => {
      expect(mockUpdateProblem).toHaveBeenCalledWith('i5', {
        actions: JSON.stringify(['Action 2', 'Action 3', 'Action 4']),
      });
    });
  });

  it('should allow editing blockers field via ListEditor', async () => {
    const user = userEvent.setup();
    const updatedProblem = { ...mockProblems[1], blockers: JSON.stringify(['Blocker 1', 'Blocker 2']) };
    mockUpdateProblem.mockResolvedValue(updatedProblem);
    
    render(<ProblemsList projectId={projectId} />);
    
    // Wait for the list cell to appear
    await waitFor(() => {
      expect(screen.getAllByText('Blocker 1').length).toBeGreaterThan(0);
    });
    
    // Find and click the blockers list cell to open ListEditor
    const blockersCell = screen.getAllByText('Blocker 1')[0].closest('.list-cell') as HTMLElement;
    await user.click(blockersCell);
    
    // Wait for ListEditor dialog to appear
    const dialog = await waitFor(() => {
      return screen.getByRole('dialog', { name: 'Blockers' });
    });
    expect(dialog).toBeInTheDocument();
    
    // Add a new item via the blank row
    const addItemInput = screen.getByLabelText(/Add item/i);
    await user.click(addItemInput);
    await user.type(addItemInput, 'Blocker 2');
    await user.keyboard('{Enter}');
    
    // Click Save button
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
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
      
      // Find the + button for adding children
      const createButtons = screen.getAllByTitle(/Add child problem/i);
      expect(createButtons.length).toBeGreaterThan(0);
      
      // Click the first + button (creates child of first problem)
      await user.click(createButtons[0]);
      
      // Verify createProblem was called with correct parameters
      await waitFor(() => {
        expect(mockCreateProblem).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({
            problem: JSON.stringify({ summary: 'New problem', detail: '' }),
            objective: JSON.stringify({ summary: 'New objective', detail: '' }),
            status: 'Actionable', // Status.NotStarted serializes to 'Actionable'
            parentId: 'i0', // Should be child of first problem
          })
        );
      });
      
      // Verify fetchProblems was called again to refresh the list
      expect(mockFetchProblems).toHaveBeenCalledTimes(2); // Once on mount, once after create
    });

    it('should create a top-level problem at bottom when + button is clicked on bottom row', async () => {
      const user = userEvent.setup();
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      // Find the + button in the bottom insert row
      const bottomButton = screen.getByTitle(/Add new problem at bottom/i);
      
      await user.click(bottomButton);
      
      // Verify createProblem was called with null parentId and priority > 0 (at bottom)
      await waitFor(() => {
        expect(mockCreateProblem).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({
            parentId: null, // Top-level problem
            priority: 1, // Higher than existing problem with priority 0
          })
        );
      });
    });

    it('should create a top-level problem at top when + button is clicked in header', async () => {
      const user = userEvent.setup();
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      // Find the + button in the header
      const headerButton = screen.getByTitle(/Add new problem at top/i);
      
      await user.click(headerButton);
      
      // Verify createProblem was called with null parentId and priority < 0 (at top)
      await waitFor(() => {
        expect(mockCreateProblem).toHaveBeenCalledWith(
          projectId,
          expect.objectContaining({
            parentId: null, // Top-level problem
            priority: -1, // Lower than existing problem with priority 0
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
      
      const createButtons = screen.getAllByTitle(/Add child problem/i);
      await user.click(createButtons[0]);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      });
      
      expect(mockCreateProblem).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Delete Problem', () => {
    it('should delete a problem when delete is confirmed inline', async () => {
      const user = userEvent.setup();
      // First fetch returns full list, second fetch returns list without the first problem
      mockFetchProblems
        .mockResolvedValueOnce(mockProblems)
        .mockResolvedValueOnce([mockProblems[1]]);
      mockDeleteProblem.mockResolvedValue({});

      render(<ProblemsList projectId={projectId} />);

      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      await user.hover(firstDataRow);

      const deleteButtons = screen.getAllByTitle(/Delete problem/i);
      expect(deleteButtons.length).toBeGreaterThan(0);

      await user.click(deleteButtons[0]);

      // Confirm inline
      const confirmButtons = screen.getAllByTitle(/Confirm delete/i);
      await user.click(confirmButtons[0]);

      await waitFor(() => {
        expect(mockDeleteProblem).toHaveBeenCalledWith('i0');
      });

      // Should refetch problems after delete
      await waitFor(() => {
        expect(mockFetchProblems).toHaveBeenCalledTimes(2);
      });

      // Problem 1 should be gone, Problem 2 should remain
      await waitFor(() => {
        expect(screen.queryByText('Problem 1')).not.toBeInTheDocument();
        expect(screen.getByText('Problem 2')).toBeInTheDocument();
      });
    });

    it('should handle delete errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteProblem.mockRejectedValue(new Error('Failed to delete problem'));

      render(<ProblemsList projectId={projectId} />);

      await waitFor(() => {
        expect(screen.getByText('Problem 1')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];
      await user.hover(firstDataRow);

      const deleteButtons = screen.getAllByTitle(/Delete problem/i);
      await user.click(deleteButtons[0]);

      const confirmButtons = screen.getAllByTitle(/Confirm delete/i);
      await user.click(confirmButtons[0]);

      await waitFor(() => {
        expect(mockDeleteProblem).toHaveBeenCalledWith('i0');
      });

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      });

      // Should not refetch on failure
      expect(mockFetchProblems).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Collapse/Expand Parent Rows', () => {
    const hierarchicalProblems: Problem[] = [
      {
        id: 'parent1',
        idPath: 'parent1',
        problem: JSON.stringify({ summary: 'Parent Problem', detail: '' }),
        objective: JSON.stringify({ summary: 'Parent Objective', detail: '' }),
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
      },
      {
        id: 'child1',
        idPath: 'parent1-child1',
        problem: JSON.stringify({ summary: 'Child Problem', detail: '' }),
        objective: JSON.stringify({ summary: 'Child Objective', detail: '' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.InProgress,
        votes: 0,
        priority: 0,
        labels: [],
        parentId: 'parent1',
        projectId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'grandchild1',
        idPath: 'parent1-child1-grandchild1',
        problem: JSON.stringify({ summary: 'Grandchild Problem', detail: '' }),
        objective: JSON.stringify({ summary: 'Grandchild Objective', detail: '' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.Blocked,
        votes: 0,
        priority: 0,
        labels: [],
        parentId: 'child1',
        projectId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'orphan1',
        idPath: 'orphan1',
        problem: JSON.stringify({ summary: 'Orphan Problem', detail: '' }),
        objective: JSON.stringify({ summary: 'Orphan Objective', detail: '' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.NotStarted,
        votes: 0,
        priority: 1,
        labels: [],
        parentId: null,
        projectId,
        createdAt: '2024-01-01T00:00:01Z',
        updatedAt: '2024-01-01T00:00:01Z',
      },
    ];

    it('should show collapse carets only for problems with children', async () => {
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
      });
      
      // Parent (has children) should have collapse controls (single caret)
      const collapseButtons = screen.getAllByTitle('Hide children');
      expect(collapseButtons.length).toBe(2); // parent1 and child1 have children
      
      // Orphan (no children) should not have collapse controls
      const orphanRow = screen.getByText('orphan1').closest('tr');
      const orphanCollapseButton = orphanRow?.querySelector('[title="Hide children"]');
      expect(orphanCollapseButton).toBeNull();
    });

    it('should hide child when parent is collapsed', async () => {
      const user = userEvent.setup();
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.getByText('Grandchild Problem')).toBeInTheDocument();
      });
      
      // Find and click the collapse button for parent1 (single caret)
      const collapseButton = screen.getAllByTitle('Hide children')[0];
      await user.click(collapseButton);
      
      // Child and grandchild should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Child Problem')).not.toBeInTheDocument();
        expect(screen.queryByText('Grandchild Problem')).not.toBeInTheDocument();
      });
      
      // Parent and orphan should still be visible
      expect(screen.getByText('Parent Problem')).toBeInTheDocument();
      expect(screen.getByText('Orphan Problem')).toBeInTheDocument();
    });

    it('should show child when parent is expanded', async () => {
      const user = userEvent.setup();
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
      });
      
      // Collapse first (single caret)
      const collapseButton = screen.getAllByTitle('Hide children')[0];
      await user.click(collapseButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Child Problem')).not.toBeInTheDocument();
      });
      
      // Expand (single caret)
      const expandButton = screen.getByTitle('Show children');
      await user.click(expandButton);
      
      // Child and grandchild should be visible again
      await waitFor(() => {
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.getByText('Grandchild Problem')).toBeInTheDocument();
      });
    });

    it('should collapse all descendants when double caret is clicked', async () => {
      const user = userEvent.setup();
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.getByText('Grandchild Problem')).toBeInTheDocument();
      });
      
      // Click "Collapse entire tree" on parent (double caret)
      const collapseAllButton = screen.getAllByTitle('Collapse entire tree')[0];
      await user.click(collapseAllButton);
      
      // All descendants should be hidden
      await waitFor(() => {
        expect(screen.queryByText('Child Problem')).not.toBeInTheDocument();
        expect(screen.queryByText('Grandchild Problem')).not.toBeInTheDocument();
      });
    });

    it('should expand all descendants when double caret is clicked on collapsed parent', async () => {
      const user = userEvent.setup();
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
      });
      
      // First collapse all (double caret)
      const collapseAllButton = screen.getAllByTitle('Collapse entire tree')[0];
      await user.click(collapseAllButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Child Problem')).not.toBeInTheDocument();
      });
      
      // Now expand all (double caret) - use getAllByTitle since header also has one
      const expandAllButtons = screen.getAllByTitle('Expand entire tree');
      await user.click(expandAllButtons[0]);
      
      // All descendants should be visible
      await waitFor(() => {
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.getByText('Grandchild Problem')).toBeInTheDocument();
      });
    });

    it('should only collapse immediate children when single caret is clicked', async () => {
      const user = userEvent.setup();
      mockFetchProblems.mockResolvedValue(hierarchicalProblems);
      
      render(<ProblemsList projectId={projectId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.getByText('Grandchild Problem')).toBeInTheDocument();
      });
      
      // Collapse child1 (which has grandchild1)
      // First, find child1's collapse button (second collapse button) - single caret
      const collapseButtons = screen.getAllByTitle('Hide children');
      const childCollapseButton = collapseButtons[1]; // child1's button
      await user.click(childCollapseButton);
      
      // Grandchild should be hidden, but parent and child should be visible
      await waitFor(() => {
        expect(screen.getByText('Parent Problem')).toBeInTheDocument();
        expect(screen.getByText('Child Problem')).toBeInTheDocument();
        expect(screen.queryByText('Grandchild Problem')).not.toBeInTheDocument();
      });
    });
  });
});

