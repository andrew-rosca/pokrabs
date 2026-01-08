/**
 * EditableCell Component
 * 
 * A cell that can be edited inline by clicking on it.
 */

import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  multiline?: boolean;
  className?: string;
}

export function EditableCell({ value, onSave, multiline = false, className = '' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [cellRect, setCellRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const isCancelingRef = useRef(false);
  const isHandlingKeyRef = useRef(false);

  useEffect(() => {
    if (isEditing && cellRef.current) {
      // Get cell position for overlay positioning
      const rect = cellRef.current.getBoundingClientRect();
      setCellRect(rect);
      
      if (inputRef.current) {
        inputRef.current.focus();
        // Select all text for easy replacement
        if (inputRef.current instanceof HTMLInputElement) {
          inputRef.current.select();
        }
      }
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleClick = () => {
    if (!isSaving) {
      setIsEditing(true);
    }
  };

  const saveAndClose = async () => {
    if (isSaving) return;
    
    if (editValue !== value) {
      setIsSaving(true);
      try {
        await onSave(editValue);
      } catch (error) {
        // Revert on error
        setEditValue(value);
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleBlur = async () => {
    if (isSaving || isCancelingRef.current || isHandlingKeyRef.current) {
      isCancelingRef.current = false; // Reset flag
      return;
    }
    await saveAndClose();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      isHandlingKeyRef.current = true; // Prevent blur event from calling handleBlur
      inputRef.current?.blur(); // Trigger blur to close input
      await saveAndClose();
      isHandlingKeyRef.current = false;
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      // Cmd/Ctrl+Enter to save in multiline mode
      e.preventDefault();
      isHandlingKeyRef.current = true; // Prevent blur event from calling handleBlur
      inputRef.current?.blur(); // Trigger blur to close input
      await saveAndClose();
      isHandlingKeyRef.current = false;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isCancelingRef.current = true; // Prevent blur from saving
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing && cellRect) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <>
        {/* Overlay backdrop */}
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
          onClick={handleBlur}
        />
        {/* Input overlay */}
        <InputComponent
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`editable-input ${className}`}
          style={{
            position: 'fixed',
            top: `${cellRect.top}px`,
            left: `${cellRect.left}px`,
            width: `${Math.max(cellRect.width, 300)}px`,
            minHeight: multiline ? '120px' : 'auto',
            padding: '0.5rem',
            fontSize: '0.75rem',
            border: '2px solid var(--accent-color)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            resize: multiline ? 'vertical' : 'none',
            boxSizing: 'border-box',
            boxShadow: '0 4px 12px var(--shadow-lg)',
            zIndex: 1001,
          }}
        />
      </>
    );
  }

  return (
    <div
      ref={cellRef}
      onClick={handleClick}
      className={`editable-cell ${className}`}
      style={{
        cursor: 'text',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
      title="Click to edit"
    >
      {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[none]</span>}
    </div>
  );
}

