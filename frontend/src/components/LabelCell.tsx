/**
 * LabelCell Component
 * 
 * A table cell that displays labels as pills and opens LabelEditor overlay when clicked.
 * Similar to ListCell and SummaryDetailCell.
 */

import { useState, useRef } from 'react';
import { LabelEditor } from './LabelEditor';

interface LabelCellProps {
  labels: string[];
  predefinedLabels?: string[];
  onSave: (labels: string[]) => Promise<void>;
  className?: string;
}

export function LabelCell({
  labels,
  predefinedLabels = [],
  onSave,
  className = '',
}: LabelCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cellRect, setCellRect] = useState<DOMRect | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setCellRect(rect);
      setIsEditing(true);
    }
  };

  const handleSave = async (newLabels: string[]) => {
    await onSave(newLabels);
    setIsEditing(false);
    setCellRect(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCellRect(null);
  };

  return (
    <>
      <div
        ref={cellRef}
        className={`label-cell ${className}`}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          minHeight: '1.5rem',
          padding: '0.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          alignItems: 'center',
          width: '100%',
          height: '100%',
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
      {isEditing && cellRect && (
        <LabelEditor
          labels={labels}
          predefinedLabels={predefinedLabels}
          onSave={handleSave}
          onCancel={handleCancel}
          cellRect={cellRect}
          className={className}
        />
      )}
    </>
  );
}

