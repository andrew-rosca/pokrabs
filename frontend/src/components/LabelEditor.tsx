/**
 * LabelEditor Component
 * 
 * A component for editing labels with pill display.
 * Supports selecting from predefined labels and creating new ones.
 */

import { useState, useRef, useEffect, useMemo } from 'react';

interface LabelEditorProps {
  labels: string[];
  predefinedLabels?: string[];
  onSave: (labels: string[]) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  cellRect?: DOMRect | null; // If provided, render as overlay positioned relative to cell
}

export function LabelEditor({
  labels: initialLabels,
  predefinedLabels = [],
  onSave,
  onCancel,
  className = '',
  cellRect,
}: LabelEditorProps) {
  const [labels, setLabels] = useState<string[]>(initialLabels);
  // If cellRect is provided, we're in overlay mode and always editing
  const [isEditing, setIsEditing] = useState(cellRect !== undefined);
  const [inputValue, setInputValue] = useState('');
  const [filteredPredefined, setFilteredPredefined] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset labels when initialLabels change (for overlay mode)
  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  // Get all unique predefined labels that aren't already selected
  const availablePredefined = useMemo(
    () => predefinedLabels.filter(label => !labels.includes(label)),
    [predefinedLabels, labels]
  );

  // Filter predefined labels based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availablePredefined.filter(label =>
        label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredPredefined(filtered);
      setShowSuggestions(filtered.length > 0 || inputValue.trim().length > 0);
    } else {
      setFilteredPredefined(availablePredefined);
      setShowSuggestions(availablePredefined.length > 0);
    }
  }, [inputValue, availablePredefined]);

  // Close suggestions when clicking outside (only in inline mode)
  useEffect(() => {
    if (cellRect) return; // Overlay mode handles this differently
    
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditing, cellRect]);

  // Focus input when overlay opens
  useEffect(() => {
    if (cellRect && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [cellRect]);

  const handleAddLabel = (label: string) => {
    const trimmedLabel = label.trim();
    if (trimmedLabel && !labels.includes(trimmedLabel)) {
      setLabels([...labels, trimmedLabel]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddLabel(inputValue);
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowSuggestions(false);
      if (onCancel) {
        onCancel();
      }
    } else if (e.key === 'Backspace' && inputValue === '' && labels.length > 0) {
      // Remove last label when backspace is pressed on empty input
      handleRemoveLabel(labels[labels.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSave = async () => {
    await onSave(labels);
    setIsEditing(false);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleCancel = () => {
    setLabels(initialLabels);
    setIsEditing(false);
    setInputValue('');
    setShowSuggestions(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleClick = () => {
    if (!isEditing && !cellRect) {
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Calculate overlay positioning
  const overlayWidth = cellRect ? Math.max(cellRect.width, 350) : undefined;
  const overlayLeft = cellRect
    ? Math.min(cellRect.left, window.innerWidth - (overlayWidth || 350) - 20)
    : undefined;
  // Position below cell, but if not enough space, position above
  const estimatedHeight = 250;
  const spaceBelow = window.innerHeight - (cellRect?.top || 0) - (cellRect?.height || 0);
  const overlayTop = cellRect
    ? spaceBelow >= estimatedHeight
      ? cellRect.top + cellRect.height + 4
      : Math.max(20, (cellRect.top || 0) - estimatedHeight - 4)
    : undefined;

  // Display mode (not editing, and not overlay mode)
  if (!isEditing && !cellRect) {
    return (
      <div
        className={`label-editor ${className}`}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          minHeight: '1.5rem',
          padding: '0.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          alignItems: 'center',
        }}
        title="Click to edit labels"
      >
        {labels.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            [none]
          </span>
        ) : (
          labels.map(label => (
            <span
              key={label}
              className="label-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.0625rem',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'nowrap',
                lineHeight: '1.2',
              }}
            >
              {label}
            </span>
          ))
        )}
      </div>
    );
  }

  // Edit mode (inline or overlay)
  const editorContent = (
    <div
      ref={containerRef}
      className={`label-editor editing ${className}`}
      style={{
        position: cellRect ? 'fixed' : 'relative',
        top: cellRect ? `${overlayTop}px` : undefined,
        left: cellRect ? `${overlayLeft}px` : undefined,
        width: cellRect ? `${overlayWidth}px` : undefined,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        border: cellRect ? '1px solid var(--border-color)' : '2px solid var(--accent-color)',
        borderRadius: '4px',
        boxShadow: cellRect ? '0 2px 8px var(--shadow-lg)' : undefined,
        zIndex: cellRect ? 1001 : undefined,
      }}
    >
      {/* Action buttons - at the top */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '0.25rem 0.5rem',
            border: '1px solid var(--accent-color)',
            borderRadius: '4px',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '0.25rem 0.5rem',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>
      </div>
      
      {/* Editor content area */}
      <div
        style={{
          position: 'relative',
          padding: '0.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          alignItems: 'center',
          minHeight: '2rem',
        }}
      >
      {/* Existing label pills */}
      {labels.map(label => (
        <span
          key={label}
          className="label-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.125rem',
            padding: '0.0625rem',
            borderRadius: '4px',
            fontSize: '0.6875rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
          }}
        >
          {label}
          <button
            type="button"
            onClick={() => handleRemoveLabel(label)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              marginLeft: '0.125rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '12px',
              height: '12px',
            }}
            title="Remove label"
            aria-label={`Remove ${label}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ×
          </button>
        </span>
      ))}

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Add label..."
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          minWidth: '100px',
          flex: 1,
        }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px var(--shadow-lg)',
            zIndex: cellRect ? 1002 : 1000,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {/* Predefined label suggestions */}
          {filteredPredefined.length > 0 && (
            <>
              <div
                style={{
                  padding: '0.5rem',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 600,
                }}
              >
                Existing labels
              </div>
              {filteredPredefined.map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAddLabel(label)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.0625rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      lineHeight: '1.2',
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Create new label option */}
          {inputValue.trim() &&
            !labels.includes(inputValue.trim()) &&
            !predefinedLabels.includes(inputValue.trim()) && (
              <div
                style={{
                  borderTop:
                    filteredPredefined.length > 0
                      ? '1px solid var(--border-color)'
                      : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleAddLabel(inputValue)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ marginRight: '0.5rem' }}>+</span>
                  Create "{inputValue.trim()}"
                </button>
              </div>
            )}
        </div>
      )}
      </div>
    </div>
  );

  // If overlay mode, wrap with backdrop
  if (cellRect) {
    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'transparent',
          }}
          onClick={handleCancel}
        />
        {editorContent}
      </>
    );
  }

  // Inline mode
  return editorContent;
}

