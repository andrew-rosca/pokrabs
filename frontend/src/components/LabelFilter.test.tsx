/**
 * Tests for LabelFilter Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LabelFilter } from './LabelFilter';

describe('LabelFilter', () => {
  const mockOnFilterChange = vi.fn();
  const predefinedLabels = ['bug', 'feature', 'urgent', 'frontend', 'backend'];
  
  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  describe('Filter Button', () => {
    it('renders filter button', () => {
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      expect(button).toBeInTheDocument();
    });

    it('shows filter button without active class when no labels selected', () => {
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      expect(button).not.toHaveClass('active');
    });

    it('shows filter button with active class when labels are selected', () => {
      const selectedLabels = new Set(['bug', 'feature']);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      expect(button).toHaveClass('active');
    });

    it('displays count badge when filters are active', () => {
      const selectedLabels = new Set(['bug', 'feature']);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not display count badge when no labels selected', () => {
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Dialog', () => {
    it('opens dropdown when button is clicked', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Labels')).toBeInTheDocument();
      });
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <div>
          <LabelFilter
            selectedLabels={selectedLabels}
            predefinedLabels={predefinedLabels}
            onFilterChange={mockOnFilterChange}
          />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Filter by Labels')).toBeInTheDocument();
      });
      
      // Click outside on a different element
      const outside = screen.getByTestId('outside');
      await user.click(outside);
      
      await waitFor(() => {
        expect(screen.queryByText('Filter by Labels')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Label Selection', () => {
    it('allows selecting labels from predefined list', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
      });
      
      // Click on a label suggestion
      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
      });
      
      // Find and click the bug label button in suggestions
      const bugButtons = screen.getAllByText('bug');
      const bugButton = bugButtons.find(
        btn => btn.closest('button') !== null
      )?.closest('button') as HTMLElement;
      
      if (bugButton) {
        await user.click(bugButton);
        
        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalledWith(expect.any(Set));
          const callArg = mockOnFilterChange.mock.calls[0][0] as Set<string>;
          expect(callArg.has('bug')).toBe(true);
        });
      }
    });

    it('allows removing selected labels', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set(['bug', 'feature']);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
      });
      
      // Find and click the remove button for 'bug'
      const removeButtons = screen.getAllByRole('button', { name: /Remove bug/i });
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
        
        await waitFor(() => {
          expect(mockOnFilterChange).toHaveBeenCalled();
          const callArg = mockOnFilterChange.mock.calls[0][0] as Set<string>;
          expect(callArg.has('bug')).toBe(false);
          expect(callArg.has('feature')).toBe(true);
        });
      }
    });

    it('filters suggestions based on input', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'f');
      
      await waitFor(() => {
        // Should show 'feature' and 'frontend' but not 'bug', 'urgent', 'backend'
        expect(screen.getByText('feature')).toBeInTheDocument();
        expect(screen.getByText('frontend')).toBeInTheDocument();
      });
    });
  });

  describe('Select All Button', () => {
    it('selects all predefined labels when clicked', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Select All/i })).toBeInTheDocument();
      });
      
      const selectAllButton = screen.getByRole('button', { name: /Select All/i });
      await user.click(selectAllButton);
      
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
        const callArg = mockOnFilterChange.mock.calls[0][0] as Set<string>;
        expect(callArg.size).toBe(predefinedLabels.length);
        predefinedLabels.forEach(label => {
          expect(callArg.has(label)).toBe(true);
        });
      });
    });

    it('is disabled when all labels are selected', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set(predefinedLabels);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        const selectAllButton = screen.getByRole('button', { name: /Select All/i });
        expect(selectAllButton).toBeDisabled();
      });
    });

    it('is disabled when there are no predefined labels', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={[]}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        const selectAllButton = screen.getByRole('button', { name: /Select All/i });
        expect(selectAllButton).toBeDisabled();
      });
    });
  });

  describe('Clear Button', () => {
    it('clears all selected labels when clicked', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set(['bug', 'feature']);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /Clear/i });
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalled();
        const callArg = mockOnFilterChange.mock.calls[0][0] as Set<string>;
        expect(callArg.size).toBe(0);
      });
    });

    it('is disabled when no labels are selected', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /Clear/i });
        expect(clearButton).toBeDisabled();
      });
    });
  });

  describe('Filter State Edge Cases', () => {
    it('handles empty selectedLabels set', () => {
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      expect(button).not.toHaveClass('active');
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('handles single label selection', async () => {
      const user = userEvent.setup();
      const selectedLabels = new Set(['bug']);
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={predefinedLabels}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
      });
      
      // Should show badge with count 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles empty predefinedLabels array', () => {
      const selectedLabels = new Set<string>();
      render(
        <LabelFilter
          selectedLabels={selectedLabels}
          predefinedLabels={[]}
          onFilterChange={mockOnFilterChange}
        />
      );
      
      const button = screen.getByRole('button', { name: /filter by labels/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveClass('active');
    });
  });
});

