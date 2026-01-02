import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ListEditor } from './ListEditor';

describe('ListEditor', () => {
  test('renders initial items', () => {
    render(<ListEditor items={['Do thing', 'Review']} onSave={vi.fn()} />);

    expect(screen.getByText('Do thing')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  test('adds a new item by typing into blank row', async () => {
    const user = userEvent.setup();
    render(<ListEditor items={['Do thing']} onSave={vi.fn()} />);

    await user.click(screen.getByLabelText(/Add item/i));
    await user.type(screen.getByLabelText(/Add item/i), 'Write tests');
    await user.keyboard('{Enter}');

    const newRow = await screen.findByTestId('list-item-2');
    expect((newRow.textContent || '').trim().length).toBeGreaterThan(0);
  });

  test('deletes row via inline delete button with confirmation', async () => {
    const user = userEvent.setup();
    render(<ListEditor items={['Keep', 'Drop']} onSave={vi.fn()} />);

    // Find the second row's handle container and trigger mouseEnter
    const handle = screen.getByLabelText(/Row 2 handle/i);
    const handleContainer = handle.parentElement as HTMLElement;
    fireEvent.mouseEnter(handleContainer);

    // Click the delete button (×) - this shows confirmation
    const deleteButton = screen.getByRole('button', { name: /Delete row/i });
    fireEvent.click(deleteButton);

    // Confirmation dialog should appear
    expect(screen.getByText('Delete?')).toBeInTheDocument();

    // Confirm the delete
    const confirmButton = screen.getByRole('button', { name: /Confirm delete/i });
    await user.click(confirmButton);

    expect(screen.queryByText('Drop')).not.toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  test('Ctrl+click on row delete button deletes without confirmation', async () => {
    const user = userEvent.setup();
    render(<ListEditor items={['Keep', 'Drop']} onSave={vi.fn()} />);

    // Hover over the second row's handle to show delete button
    const handle = screen.getByLabelText(/Row 2 handle/i);
    await user.hover(handle);

    // Find the row's delete button (×)
    const deleteButton = screen.getByRole('button', { name: /Delete row/i });
    
    // Ctrl+click should delete immediately without confirmation
    // Use fireEvent with ctrlKey
    fireEvent.click(deleteButton, { ctrlKey: true });

    // Should be deleted without showing confirmation
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
    expect(screen.queryByText('Drop')).not.toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  test('saves trimmed list without blanks', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(<ListEditor items={['  First  ', '   ']} onSave={handleSave} />);

    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(['First']);
    });
  });

  test('invokes onCancel when clicking backdrop', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(<ListEditor items={['One']} onSave={vi.fn()} onCancel={handleCancel} />);

    await user.click(screen.getByTestId('list-editor-backdrop'));

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  test('reorders via drag handle', async () => {
    render(<ListEditor items={['Alpha', 'Bravo', 'Charlie']} onSave={vi.fn()} />);

    const firstHandle = screen.getByLabelText(/Row 1 handle/i);
    const thirdRow = screen.getByTestId('list-item-3');

    const data: any = {
      setData: () => {},
      getData: () => '',
      effectAllowed: 'move',
      dropEffect: 'move',
      files: [],
      items: [],
      types: [],
    };
    fireEvent.dragStart(firstHandle, { dataTransfer: data });
    fireEvent.dragOver(thirdRow, { dataTransfer: data });
    fireEvent.drop(thirdRow, { dataTransfer: data });
    fireEvent.dragEnd(firstHandle, { dataTransfer: data });

    const rows = screen.getAllByTestId(/list-item-/);
    expect(rows[0]).toHaveTextContent('Bravo');
    expect(rows[1]).toHaveTextContent('Charlie');
    expect(rows[2]).toHaveTextContent('Alpha');
  });

  test('renders hyperlinks inside items', () => {
    render(<ListEditor items={['Check https://example.com/docs']} onSave={vi.fn()} />);

    const link = screen.getByRole('link', { name: /example.com\/docs/i });
    expect(link).toBeInTheDocument();
    expect((link as HTMLAnchorElement).href).toContain('https://example.com/docs');
  });
});

