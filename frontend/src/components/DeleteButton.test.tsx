import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DeleteButton } from './DeleteButton';

describe('DeleteButton', () => {
  test('renders delete button when visible', () => {
    render(<DeleteButton onDelete={vi.fn()} visible={true} />);
    expect(screen.getByRole('button', { name: /Delete row/i })).toBeInTheDocument();
  });

  test('does not render when visible is false', () => {
    render(<DeleteButton onDelete={vi.fn()} visible={false} />);
    expect(screen.queryByRole('button', { name: /Delete row/i })).not.toBeInTheDocument();
  });

  test('shows confirmation dialog on click', async () => {
    const user = userEvent.setup();
    render(<DeleteButton onDelete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Delete row/i }));

    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel delete/i })).toBeInTheDocument();
  });

  test('calls onDelete when confirmed', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(<DeleteButton onDelete={handleDelete} />);

    await user.click(screen.getByRole('button', { name: /Delete row/i }));
    await user.click(screen.getByRole('button', { name: /Confirm delete/i }));

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  test('hides confirmation on cancel', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(<DeleteButton onDelete={handleDelete} />);

    await user.click(screen.getByRole('button', { name: /Delete row/i }));
    expect(screen.getByText('Delete?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cancel delete/i }));

    expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
    expect(handleDelete).not.toHaveBeenCalled();
  });

  test('Ctrl+click deletes immediately without confirmation', () => {
    const handleDelete = vi.fn();
    render(<DeleteButton onDelete={handleDelete} />);

    const deleteButton = screen.getByRole('button', { name: /Delete row/i });
    fireEvent.click(deleteButton, { ctrlKey: true });

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
  });

  test('Escape key cancels confirmation', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(<DeleteButton onDelete={handleDelete} />);

    await user.click(screen.getByRole('button', { name: /Delete row/i }));
    expect(screen.getByText('Delete?')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
    });
    expect(handleDelete).not.toHaveBeenCalled();
  });

  test('uses small size for ListEditor', () => {
    render(<DeleteButton onDelete={vi.fn()} size="small" />);
    const button = screen.getByRole('button', { name: /Delete row/i });
    expect(button).toHaveStyle({ width: '20px', height: '20px' });
  });

  test('uses default size for main table', () => {
    render(<DeleteButton onDelete={vi.fn()} size="default" />);
    const button = screen.getByRole('button', { name: /Delete row/i });
    expect(button).toHaveStyle({ width: '24px', height: '24px' });
  });

  test('accepts custom aria-label and title', () => {
    render(
      <DeleteButton
        onDelete={vi.fn()}
        ariaLabel="Delete this item"
        title="Custom tooltip"
      />
    );
    const button = screen.getByRole('button', { name: /Delete this item/i });
    expect(button).toHaveAttribute('title', 'Custom tooltip');
  });

  test('resets confirmation when visibility changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DeleteButton onDelete={vi.fn()} visible={true} />);

    await user.click(screen.getByRole('button', { name: /Delete row/i }));
    expect(screen.getByText('Delete?')).toBeInTheDocument();

    // Hide the button
    rerender(<DeleteButton onDelete={vi.fn()} visible={false} />);

    // Confirmation should be cleared
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
  });
});

