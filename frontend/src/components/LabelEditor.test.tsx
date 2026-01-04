/**
 * Tests for LabelEditor Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LabelEditor } from './LabelEditor';

describe('LabelEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Display mode (not editing, no cellRect)', () => {
    it('should render labels as pills', () => {
      render(
        <LabelEditor
          labels={['urgent', 'frontend']}
          predefinedLabels={[]}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('should show placeholder when no labels', () => {
      render(
        <LabelEditor
          labels={[]}
          predefinedLabels={[]}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('[none]')).toBeInTheDocument();
    });

    it('should enter edit mode when clicked', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
        />
      );

      const editor = screen.getByText('urgent').closest('.label-editor');
      await user.click(editor!);

      // Should show input field
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
    });
  });

  describe('Edit mode (overlay with cellRect)', () => {
    const mockCellRect: DOMRect = {
      top: 100,
      left: 200,
      width: 300,
      height: 50,
      bottom: 150,
      right: 500,
      x: 200,
      y: 100,
      toJSON: vi.fn(),
    };

    it('should render in edit mode when cellRect is provided', () => {
      render(
        <LabelEditor
          labels={['urgent', 'frontend']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      // Should show input field immediately
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
      // Should show Save and Cancel buttons
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should display existing labels as pills with remove buttons', () => {
      render(
        <LabelEditor
          labels={['urgent', 'frontend']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      expect(screen.getByText('urgent')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      
      // Should have remove buttons
      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeButtons.length).toBe(2);
    });

    it('should remove label when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent', 'frontend']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /Remove urgent/i });
      await user.click(removeButtons[0]);

      // Label should be removed from display
      expect(screen.queryByText('urgent')).not.toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('should add label by typing and pressing Enter', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'bug');
      await user.keyboard('{Enter}');

      // New label should appear
      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('should not add duplicate labels', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'urgent');
      await user.keyboard('{Enter}');

      // Should still only have one 'urgent' label
      const urgentLabels = screen.getAllByText('urgent');
      expect(urgentLabels.length).toBe(1);
    });

    it('should show suggestions dropdown when input is focused', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={['bug', 'feature', 'frontend']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);

      // Should show suggestions
      await waitFor(() => {
        expect(screen.getByText('Existing labels')).toBeInTheDocument();
      });
      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('feature')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
    });

    it('should filter suggestions based on input', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={[]}
          predefinedLabels={['bug', 'feature', 'frontend', 'backend']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);
      await user.type(input, 'f');

      await waitFor(() => {
        // Should filter to labels starting with 'f'
        expect(screen.getByText('feature')).toBeInTheDocument();
        expect(screen.getByText('frontend')).toBeInTheDocument();
        expect(screen.queryByText('bug')).not.toBeInTheDocument();
        expect(screen.queryByText('backend')).not.toBeInTheDocument();
      });
    });

    it('should add label from suggestions when clicked', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={[]}
          predefinedLabels={['bug', 'feature']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
      });

      // Click on the bug suggestion button
      const bugButtons = screen.getAllByText('bug');
      const bugButton = bugButtons.find(
        el => el.closest('button') !== null
      )?.closest('button') as HTMLElement;
      expect(bugButton).toBeInTheDocument();
      await user.click(bugButton!);

      // Bug label should be added as a pill (suggestion disappears since it's now selected)
      await waitFor(() => {
        const bugPills = screen.getAllByText('bug');
        // Should have exactly 1 - the pill (suggestion is removed since bug is now in labels)
        expect(bugPills.length).toBe(1);
      });
    });

    it('should show create new label option when input does not match predefined', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={[]}
          predefinedLabels={['bug', 'feature']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'custom-label');

      await waitFor(() => {
        expect(screen.getByText(/Create "custom-label"/i)).toBeInTheDocument();
      });
    });

    it('should create new label when create option is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={[]}
          predefinedLabels={['bug']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'custom-label');

      await waitFor(() => {
        const createButton = screen.getByText(/Create "custom-label"/i).closest('button');
        expect(createButton).toBeInTheDocument();
      });

      const createButton = screen.getByText(/Create "custom-label"/i).closest('button') as HTMLElement;
      await user.click(createButton);

      // Custom label should be added
      expect(screen.getByText('custom-label')).toBeInTheDocument();
    });

    it('should save labels when Save button is clicked', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      // Add a new label
      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'bug');
      await user.keyboard('{Enter}');

      // Click Save
      const saveButton = screen.getByRole('button', { name: /Save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(['urgent', 'bug']);
      });
    });

    it('should cancel editing when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      // Add a label
      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'bug');
      await user.keyboard('{Enter}');

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should handle Escape key to cancel', async () => {
      const user = userEvent.setup();
      
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);
      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should handle Backspace on empty input to remove last label', async () => {
      const user = userEvent.setup();
      
      render(
        <LabelEditor
          labels={['urgent', 'frontend']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);
      await user.keyboard('{Backspace}');

      // Last label (frontend) should be removed
      expect(screen.queryByText('frontend')).not.toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('should not remove label on Backspace if input has text', async () => {
      const user = userEvent.setup();
      
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={[]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.type(input, 'test');
      await user.keyboard('{Backspace}');

      // Label should still be there
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('should exclude already selected labels from suggestions', async () => {
      const user = userEvent.setup();
      render(
        <LabelEditor
          labels={['urgent']}
          predefinedLabels={['urgent', 'bug', 'feature']}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          cellRect={mockCellRect}
        />
      );

      const input = screen.getByPlaceholderText('Add label...');
      await user.click(input);

      await waitFor(() => {
        // 'urgent' should not appear in suggestions since it's already selected
        const suggestionButtons = screen.getAllByText('bug').concat(screen.getAllByText('feature'));
        expect(suggestionButtons.length).toBeGreaterThan(0);
      });

      // Should not show 'urgent' in suggestions
      const allUrgent = screen.getAllByText('urgent');
      // One is the pill, none should be in suggestions
      expect(allUrgent.length).toBe(1);
    });
  });
});

