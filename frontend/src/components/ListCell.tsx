import { useRef, useState } from 'react';
import { ListEditor } from './ListEditor';

interface ListCellProps {
  /** JSON string representing array of items, e.g. '["item1", "item2"]' */
  value: string;
  /** Called when the list is saved */
  onSave: (jsonValue: string) => Promise<void> | void;
  /** Title for the editor dialog */
  title?: string;
  /** CSS class for styling */
  className?: string;
}

/**
 * A table cell that displays a list of items and opens ListEditor for editing.
 * 
 * - Displays items as comma-separated text in the cell
 * - Click to open ListEditor overlay
 * - Supports add, edit, delete, and reorder via ListEditor
 */
export function ListCell({ value, onSave, title = 'Edit list', className = '' }: ListCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Parse JSON array from value
  const parseItems = (): string[] => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      // If parsing fails, treat as empty or single item
      if (value && value.trim()) {
        return [value];
      }
      return [];
    }
  };

  const items = parseItems();

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleSave = async (newItems: string[]) => {
    const jsonValue = JSON.stringify(newItems);
    await onSave(jsonValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Get anchor rect for positioning the editor
  const getAnchorRect = (): DOMRect | undefined => {
    return cellRef.current?.getBoundingClientRect();
  };

  // Display format: comma-separated or placeholder
  const displayText = items.length > 0 ? items.join(', ') : '-';

  return (
    <>
      <div
        ref={cellRef}
        className={`list-cell editable-cell ${className}`}
        onClick={handleClick}
        style={{
          cursor: 'text',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
        title="Click to edit list"
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {displayText}
        </span>
      </div>
      {isEditing && (
        <ListEditor
          items={items}
          onSave={handleSave}
          onCancel={handleCancel}
          title={title}
          anchorRect={getAnchorRect()}
        />
      )}
    </>
  );
}

