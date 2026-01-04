/**
 * Tests for LabelCell Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LabelCell } from './LabelCell';

describe('LabelCell', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render labels as pills', () => {
    render(
      <LabelCell
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
      <LabelCell
        labels={[]}
        predefinedLabels={[]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('[none]')).toBeInTheDocument();
  });

  it('should open LabelEditor overlay when clicked', async () => {
    const user = userEvent.setup();
    render(
      <LabelCell
        labels={['urgent']}
        predefinedLabels={[]}
        onSave={mockOnSave}
      />
    );

    const cell = screen.getByText('urgent').closest('.label-cell');
    await user.click(cell!);

    // LabelEditor should appear with input field
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
    });
    
    // Should show Save and Cancel buttons
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('should call onSave when LabelEditor saves', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);
    
    render(
      <LabelCell
        labels={['urgent']}
        predefinedLabels={[]}
        onSave={mockOnSave}
      />
    );

    // Open editor
    const cell = screen.getByText('urgent').closest('.label-cell');
    await user.click(cell!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
    });

    // Add a label
    const input = screen.getByPlaceholderText('Add label...');
    await user.type(input, 'bug');
    await user.keyboard('{Enter}');

    // Save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(['urgent', 'bug']);
    });
  });

  it('should close editor after save', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);
    
    render(
      <LabelCell
        labels={['urgent']}
        predefinedLabels={[]}
        onSave={mockOnSave}
      />
    );

    // Open editor
    const cell = screen.getByText('urgent').closest('.label-cell');
    await user.click(cell!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
    });

    // Save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    // Editor should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add label...')).not.toBeInTheDocument();
    });
  });

  it('should close editor when Cancel is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <LabelCell
        labels={['urgent']}
        predefinedLabels={[]}
        onSave={mockOnSave}
      />
    );

    // Open editor
    const cell = screen.getByText('urgent').closest('.label-cell');
    await user.click(cell!);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add label...')).toBeInTheDocument();
    });

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Editor should close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add label...')).not.toBeInTheDocument();
    });

    // onSave should not be called
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should pass predefinedLabels to LabelEditor', async () => {
    const user = userEvent.setup();
    render(
      <LabelCell
        labels={[]}
        predefinedLabels={['bug', 'feature']}
        onSave={mockOnSave}
      />
    );

    // Open editor
    const cell = screen.getByText('[none]').closest('.label-cell');
    await user.click(cell!);

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Add label...');
      expect(input).toBeInTheDocument();
    });

    // Focus input to show suggestions
    const input = screen.getByPlaceholderText('Add label...');
    await user.click(input);

    // Should show predefined labels in suggestions
    await waitFor(() => {
      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('feature')).toBeInTheDocument();
    });
  });
});

