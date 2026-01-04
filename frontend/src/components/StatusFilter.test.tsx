import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatusFilter } from './StatusFilter';
import { Status } from '../../../shared/types';

describe('StatusFilter', () => {
  const mockOnFilterChange = vi.fn();
  
  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  describe('Filter Button', () => {
    it('renders filter button', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toBeInTheDocument();
    });

    it('shows filter button without active class when all statuses selected', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).not.toHaveClass('active');
    });

    it('shows filter button with active class when some statuses filtered', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toHaveClass('active');
    });

    it('displays count badge when filters are active', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not display count badge when all statuses selected', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      expect(screen.queryByText('4')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Dialog', () => {
    it('opens dropdown when filter button clicked', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      });
    });

    it('closes dropdown when filter button clicked again', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      });
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.queryByText('Filter by Status')).not.toBeInTheDocument();
      });
    });

    it('displays Select All and Clear buttons', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      });
    });

    it('displays all four status checkboxes', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Actionable')).toBeInTheDocument();
        expect(screen.getByLabelText('In Progress')).toBeInTheDocument();
        expect(screen.getByLabelText('Blocked')).toBeInTheDocument();
        expect(screen.getByLabelText('Resolved')).toBeInTheDocument();
      });
    });
  });

  describe('Status Checkbox Interactions', () => {
    it('shows checked checkboxes for selected statuses', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.Blocked]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Actionable')).toBeChecked();
        expect(screen.getByLabelText('In Progress')).not.toBeChecked();
        expect(screen.getByLabelText('Blocked')).toBeChecked();
        expect(screen.getByLabelText('Resolved')).not.toBeChecked();
      });
    });

    it('calls onFilterChange when checkbox is toggled', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Blocked')).toBeInTheDocument();
      });
      
      const blockedCheckbox = screen.getByLabelText('Blocked');
      fireEvent.click(blockedCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      const calledWith = mockOnFilterChange.mock.calls[0][0];
      expect(calledWith.has(Status.NotStarted)).toBe(true);
      expect(calledWith.has(Status.InProgress)).toBe(true);
      expect(calledWith.has(Status.Blocked)).toBe(false);
      expect(calledWith.has(Status.Resolved)).toBe(true);
    });

    it('adds status when unchecked checkbox is clicked', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.Blocked]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByLabelText('In Progress')).toBeInTheDocument();
      });
      
      const inProgressCheckbox = screen.getByLabelText('In Progress');
      fireEvent.click(inProgressCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      const calledWith = mockOnFilterChange.mock.calls[0][0];
      expect(calledWith.has(Status.InProgress)).toBe(true);
      expect(calledWith.size).toBe(3);
    });
  });

  describe('Select All Button', () => {
    it('calls onFilterChange with all statuses when Select All clicked', async () => {
      const selectedStatuses = new Set([Status.NotStarted]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      });
      
      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      fireEvent.click(selectAllButton);
      
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      const calledWith = mockOnFilterChange.mock.calls[0][0];
      expect(calledWith.size).toBe(4);
      expect(calledWith.has(Status.NotStarted)).toBe(true);
      expect(calledWith.has(Status.InProgress)).toBe(true);
      expect(calledWith.has(Status.Blocked)).toBe(true);
      expect(calledWith.has(Status.Resolved)).toBe(true);
    });

    it('disables Select All button when all statuses already selected', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select all/i })).toBeDisabled();
      });
    });

    it('enables Select All button when some statuses not selected', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select all/i })).not.toBeDisabled();
      });
    });
  });

  describe('Clear Button', () => {
    it('calls onFilterChange with empty set when Clear clicked', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      const calledWith = mockOnFilterChange.mock.calls[0][0];
      expect(calledWith.size).toBe(0);
    });

    it('disables Clear button when no statuses selected', async () => {
      const selectedStatuses = new Set<Status>();
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
      });
    });

    it('enables Clear button when at least one status selected', async () => {
      const selectedStatuses = new Set([Status.Blocked]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).not.toBeDisabled();
      });
    });
  });

  describe('Filter State Edge Cases', () => {
    it('handles empty selectedStatuses set', () => {
      const selectedStatuses = new Set<Status>();
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toHaveClass('active'); // Active because not all statuses are selected
      expect(screen.getByText('0')).toBeInTheDocument(); // Shows 0 badge
    });

    it('handles single status selection', async () => {
      const selectedStatuses = new Set([Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Actionable')).not.toBeChecked();
        expect(screen.getByLabelText('In Progress')).not.toBeChecked();
        expect(screen.getByLabelText('Blocked')).not.toBeChecked();
        expect(screen.getByLabelText('Resolved')).toBeChecked();
      });
    });

    it('handles multiple sequential toggles', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      const { rerender } = render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      // First toggle - remove Blocked
      await waitFor(() => {
        expect(screen.getByLabelText('Blocked')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('Blocked'));
      
      // Rerender with updated statuses
      const newStatuses1 = new Set([Status.NotStarted, Status.InProgress, Status.Resolved]);
      rerender(<StatusFilter selectedStatuses={newStatuses1} onFilterChange={mockOnFilterChange} />);
      
      // Second toggle - remove In Progress
      fireEvent.click(screen.getByLabelText('In Progress'));
      
      expect(mockOnFilterChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on filter button', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toHaveAttribute('aria-label', 'Filter by status');
    });

    it('shows helpful title on filter button when no filters active', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toHaveAttribute('title', 'Filter by status');
    });

    it('shows helpful title on filter button when filters active', () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      expect(button).toHaveAttribute('title', 'Filtered: 2 of 4 statuses shown');
    });

    it('all checkboxes are keyboard accessible', async () => {
      const selectedStatuses = new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      render(<StatusFilter selectedStatuses={selectedStatuses} onFilterChange={mockOnFilterChange} />);
      
      const button = screen.getByRole('button', { name: /filter by status/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(4);
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('type', 'checkbox');
        });
      });
    });
  });
});

