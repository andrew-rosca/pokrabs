/**
 * LabelEditor Component
 * 
 * A component for editing labels with pill display.
 * Supports selecting from predefined labels and creating new ones.
 * Uses LabelSelector for the core selection UI.
 */

import { useState, useRef, useEffect } from 'react';
import { LabelSelector } from './LabelSelector';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset labels when initialLabels change (for overlay mode)
  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  // Focus input when overlay opens
  useEffect(() => {
    if (cellRect && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [cellRect]);

  const handleLabelsChange = (newLabels: string[]) => {
    setLabels(newLabels);
  };

  const handleSave = async () => {
    await onSave(labels);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLabels(initialLabels);
    setIsEditing(false);
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
      
      {/* Editor content area - use LabelSelector */}
      <div
        style={{
          padding: '0.5rem',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
      >
        <LabelSelector
          selectedLabels={labels}
          predefinedLabels={predefinedLabels}
          onLabelsChange={handleLabelsChange}
          allowCreate={true}
          showRemoveButtons={true}
          inputRef={inputRef}
          containerRef={containerRef}
          autoFocus={cellRect !== undefined}
          zIndex={cellRect ? 1002 : 1000}
        />
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
