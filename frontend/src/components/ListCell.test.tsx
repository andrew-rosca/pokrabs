import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ListCell } from './ListCell';

describe('ListCell', () => {
  test('renders items as comma-separated text', () => {
    render(
      <ListCell
        value={JSON.stringify(['Item 1', 'Item 2', 'Item 3'])}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Item 1, Item 2, Item 3')).toBeInTheDocument();
  });

  test('renders placeholder when empty array', () => {
    render(
      <ListCell
        value={JSON.stringify([])}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  test('handles malformed JSON gracefully', () => {
    render(
      <ListCell
        value="not valid json"
        onSave={vi.fn()}
      />
    );

    // Should treat as single item
    expect(screen.getByText('not valid json')).toBeInTheDocument();
  });

  test('opens ListEditor when clicked', async () => {
    const user = userEvent.setup();
    render(
      <ListCell
        value={JSON.stringify(['Alpha', 'Beta'])}
        onSave={vi.fn()}
        title="Test List"
      />
    );

    await user.click(screen.getByText('Alpha, Beta'));

    // ListEditor dialog should appear
    expect(screen.getByRole('dialog', { name: 'Test List' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  test('calls onSave with JSON string when ListEditor saves', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);
    
    render(
      <ListCell
        value={JSON.stringify(['First'])}
        onSave={handleSave}
        title="Items"
      />
    );

    // Open editor
    await user.click(screen.getByText('First'));
    
    // Add a new item
    const addItemInput = screen.getByLabelText(/Add item/i);
    await user.click(addItemInput);
    await user.type(addItemInput, 'Second');
    await user.keyboard('{Enter}');
    
    // Save
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(JSON.stringify(['First', 'Second']));
    });
  });

  test('closes ListEditor when cancelled', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    
    render(
      <ListCell
        value={JSON.stringify(['Item'])}
        onSave={handleSave}
      />
    );

    // Open editor
    await user.click(screen.getByText('Item'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Click backdrop to cancel
    await user.click(screen.getByTestId('list-editor-backdrop'));
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    expect(handleSave).not.toHaveBeenCalled();
  });

  test('applies custom className', () => {
    render(
      <ListCell
        value={JSON.stringify(['Test'])}
        onSave={vi.fn()}
        className="custom-class"
      />
    );

    const cell = screen.getByText('Test').closest('.list-cell');
    expect(cell).toHaveClass('custom-class');
  });
});

