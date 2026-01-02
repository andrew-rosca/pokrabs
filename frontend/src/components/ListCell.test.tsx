import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ListCell } from './ListCell';

describe('ListCell', () => {
  test('renders items one per line', () => {
    render(
      <ListCell
        value={JSON.stringify(['Item 1', 'Item 2', 'Item 3'])}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  test('renders placeholder when empty array', () => {
    render(
      <ListCell
        value={JSON.stringify([])}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('[none]')).toBeInTheDocument();
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

    // Click on the list cell (find via first item)
    const listCell = screen.getByText('Alpha').closest('.list-cell') as HTMLElement;
    await user.click(listCell);

    // ListEditor dialog should appear
    expect(screen.getByRole('dialog', { name: 'Test List' })).toBeInTheDocument();
    // Items are now shown in the ListEditor
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
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

  test('shows expand button when content overflows', async () => {
    // Mock scrollHeight to simulate overflow
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollHeight'
    );
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientHeight'
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        // Return large value for the content container to simulate overflow
        if (this.style?.overflow === 'hidden') {
          return 200;
        }
        return 50;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        if (this.style?.overflow === 'hidden') {
          return 64; // COLLAPSED_MAX_HEIGHT
        }
        return 50;
      },
    });

    render(
      <ListCell
        value={JSON.stringify(['One', 'Two', 'Three', 'Four', 'Five'])}
        onSave={vi.fn()}
      />
    );

    // Wait for async overflow check to complete
    await waitFor(() => {
      expect(screen.getByTitle(/Expand list/i)).toBeInTheDocument();
    });
    
    // All items are in the DOM (but potentially hidden via CSS)
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.getByText('Four')).toBeInTheDocument();
    expect(screen.getByText('Five')).toBeInTheDocument();

    // Restore original properties
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
    }
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    }
  });

  test('expands to show all items when caret clicked', async () => {
    // Mock scrollHeight to simulate overflow
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollHeight'
    );
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientHeight'
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        if (this.style?.overflow === 'hidden') {
          return 200;
        }
        return 50;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        if (this.style?.overflow === 'hidden') {
          return 64;
        }
        return 50;
      },
    });

    const user = userEvent.setup();
    render(
      <ListCell
        value={JSON.stringify(['One', 'Two', 'Three', 'Four', 'Five'])}
        onSave={vi.fn()}
      />
    );

    // Wait for async overflow check, then click expand button
    const expandButton = await waitFor(() => screen.getByTitle(/Expand list/i));
    await user.click(expandButton);

    // Should now show all items (with no max-height constraint)
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.getByText('Four')).toBeInTheDocument();
    expect(screen.getByText('Five')).toBeInTheDocument();
    
    // Button should now say collapse
    expect(screen.getByTitle(/Collapse list/i)).toBeInTheDocument();

    // Restore original properties
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
    }
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    }
  });

  test('does not show expand button when content fits', () => {
    // Ensure we restore proper values - in jsdom scrollHeight/clientHeight default to 0
    // With scrollHeight === clientHeight (both 0), hasOverflow should be false
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 50;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return 50;
      },
    });

    render(
      <ListCell
        value={JSON.stringify(['One', 'Two', 'Three'])}
        onSave={vi.fn()}
      />
    );

    // Should not show expand button when no overflow
    expect(screen.queryByTitle(/Expand list/i)).not.toBeInTheDocument();
    
    // All items should be visible
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });
});

