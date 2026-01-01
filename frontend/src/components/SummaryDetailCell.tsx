/**
 * SummaryDetailCell Component
 * 
 * A cell that displays a summary and opens SummaryDetailEditor when clicked.
 * Used for fields that have both summary and detail (problem, objective).
 */

import { useState, useRef, useEffect } from 'react';
import { SummaryDetailEditor } from './SummaryDetailEditor';

interface SummaryDetailCellProps {
  value: string; // JSON string with { summary: string, detail: string }
  onSave: (newValue: string) => Promise<void>;
  className?: string;
  autoOpen?: boolean; // If true, automatically open the editor
  onEditorOpened?: () => void; // Callback when editor opens
}

export function SummaryDetailCell({ value, onSave, className = '', autoOpen = false, onEditorOpened }: SummaryDetailCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cellRect, setCellRect] = useState<DOMRect | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Parse the JSON to get the summary for display
  const getSummary = (): string => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed.summary !== undefined) {
        return parsed.summary || '';
      }
      return value || '';
    } catch {
      return value || '';
    }
  };

  const openEditor = () => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setCellRect(rect);
      setIsEditing(true);
      if (onEditorOpened) {
        onEditorOpened();
      }
    }
  };

  const handleClick = () => {
    openEditor();
  };

  // Auto-open editor if requested
  useEffect(() => {
    if (autoOpen && !isEditing && cellRef.current) {
      // Small delay to ensure the cell is rendered
      const timer = setTimeout(() => {
        openEditor();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, isEditing]);

  const handleSave = async (newValue: string) => {
    await onSave(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const summary = getSummary();

  return (
    <>
      <div
        ref={cellRef}
        onClick={handleClick}
        className={`summary-detail-cell editable-cell ${className}`}
        style={{
          cursor: 'text',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
        title="Click to edit summary and detail"
      >
        {summary || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[none]</span>}
      </div>
      {isEditing && cellRect && (
        <SummaryDetailEditor
          value={value}
          onSave={handleSave}
          onCancel={handleCancel}
          cellRect={cellRect}
          className={className}
        />
      )}
    </>
  );
}

