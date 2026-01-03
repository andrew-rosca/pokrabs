import { useRef, useState, useEffect } from 'react';
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
  /** Problem ID for parent component tracking (not used in this component directly) */
  problemId?: string;
}

/** Max height for collapsed content (~3 lines at 1.3 line-height, 12px font) */
const MAX_COLLAPSED_HEIGHT = 48;

/**
 * A table cell that displays a list of items and opens ListEditor for editing.
 * 
 * - Displays items one per line with text wrapping
 * - When expanded: shows all content, contributes to row height
 * - When collapsed: shows content up to ~3 lines, fills row if another cell is taller
 * - Click to open ListEditor overlay
 */
export function ListCell({ value, onSave, title = 'Edit list', className = '' }: ListCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Check if content overflows the available space
  useEffect(() => {
    const checkOverflow = () => {
      if (!isExpanded && wrapperRef.current && contentRef.current) {
        const wrapperHeight = wrapperRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        setHasOverflow(contentHeight > wrapperHeight + 2); // +2 for rounding
      } else {
        setHasOverflow(false);
      }
    };

    // Delay check to allow DOM to update after expand/collapse toggle
    const timer = setTimeout(checkOverflow, 0);

    // Use ResizeObserver to re-check when wrapper size changes
    // This happens when another cell in the row expands/collapses
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [items, isExpanded, value]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't open editor if clicking on the expand button
    if ((e.target as HTMLElement).closest('.expand-toggle')) {
      return;
    }
    setIsEditing(true);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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

  // Show caret if expanded OR if there's overflow when collapsed
  const showCaret = isExpanded || hasOverflow;

  // Content items to render
  const contentItems = (
    <>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.3,
            backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-list-alt)',
            padding: '0.125rem 0.25rem',
            marginLeft: '-0.25rem',
            marginRight: '-0.25rem',
          }}
        >
          {item}
        </div>
      ))}
    </>
  );

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
          flexDirection: 'column',
          justifyContent: 'flex-start',
          position: 'relative',
          padding: '0.25rem 0',
        }}
        title="Click to edit list"
      >
        {items.length === 0 ? (
          <span style={{ color: 'var(--text-secondary)', opacity: 0.6, fontStyle: 'italic' }}>[none]</span>
        ) : isExpanded ? (
          // Expanded: content flows normally, contributes to row height
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
            <div ref={contentRef} style={{ flex: 1 }}>
              {contentItems}
            </div>
            <button
              className="expand-toggle"
              onClick={handleExpandToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.125rem 0.25rem',
                fontSize: '0.625rem',
                color: 'var(--text-secondary)',
                opacity: 0.65,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
                flexShrink: 0,
              }}
              title="Collapse list"
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
            >
              ⌄
            </button>
          </div>
        ) : (
          // Collapsed: use a sizer div to establish height (capped at ~3 lines)
          // and absolute content to fill available space
          <>
            {/* Invisible sizer: establishes cell height based on item count, capped at ~3 lines */}
            <div
              aria-hidden="true"
              style={{
                height: `${Math.min(items.length * 16, MAX_COLLAPSED_HEIGHT)}px`,
                pointerEvents: 'none',
              }}
            />
            {/* Visible content: absolutely positioned to fill available space */}
            <div
              ref={wrapperRef}
              style={{
                position: 'absolute',
                top: '0.25rem',
                left: 0,
                right: 0,
                bottom: '0.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.25rem',
                overflow: 'hidden',
              }}
            >
              <div
                ref={contentRef}
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  height: '100%',
                  // Use mask-image for fade effect - works with any background
                  ...(hasOverflow ? {
                    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  } : {}),
                }}
              >
                {contentItems}
              </div>
              {showCaret && (
                <button
                  className="expand-toggle"
                  onClick={handleExpandToggle}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.125rem 0.25rem',
                    fontSize: '0.625rem',
                    color: 'var(--text-secondary)',
                    opacity: 0.65,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '16px',
                    height: '16px',
                    flexShrink: 0,
                  }}
                  title="Expand list"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
                >
                  &gt;
                </button>
              )}
            </div>
          </>
        )}
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
