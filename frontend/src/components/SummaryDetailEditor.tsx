/**
 * SummaryDetailEditor Component
 * 
 * A component for editing fields that have both summary and detail.
 * Opens as an overlay with two text areas: one for summary and one for detail.
 */

import { useState, useRef, useEffect } from 'react';

interface SummaryDetailData {
  summary: string;
  detail: string;
}

interface SummaryDetailEditorProps {
  value: string; // JSON string with { summary: string, detail: string }
  onSave: (newValue: string) => Promise<void>;
  onCancel?: () => void;
  cellRect: DOMRect;
  className?: string;
}

export function SummaryDetailEditor({
  value,
  onSave,
  onCancel,
  cellRect,
  className = '',
}: SummaryDetailEditorProps) {
  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const summaryRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLTextAreaElement>(null);

  // Parse the JSON value and initialize state
  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed.summary !== undefined) {
        setSummary(parsed.summary || '');
        setDetail(parsed.detail || '');
      } else {
        // If it's not the expected format, treat the whole value as both summary and detail
        setSummary(value || '');
        setDetail(value || '');
      }
    } catch {
      // If parsing fails, treat the whole value as both summary and detail
      setSummary(value || '');
      setDetail(value || '');
    }
  }, [value]);

  // Focus summary field when editor opens and select text if it's "New problem" or "New objective"
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.focus();
      // Select all text if it's a default "New" value, otherwise just focus
      if (summary === 'New problem' || summary === 'New objective') {
        summaryRef.current.select();
      }
    }
  }, [summary]);

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const newValue = JSON.stringify({ summary, detail });
      await onSave(newValue);
    } catch (error) {
      console.error('Failed to save:', error);
      // Don't close on error - let user retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'summary' | 'detail') => {
    // Cmd/Ctrl+Enter to save
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab' && field === 'summary' && !e.shiftKey) {
      // Tab from summary to detail
      e.preventDefault();
      if (detailRef.current) {
        detailRef.current.focus();
      }
    } else if (e.key === 'Tab' && field === 'detail' && e.shiftKey) {
      // Shift+Tab from detail to summary
      e.preventDefault();
      if (summaryRef.current) {
        summaryRef.current.focus();
      }
    } else if (e.key === 'Enter' && field === 'summary' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // Enter in summary field moves to detail
      e.preventDefault();
      if (detailRef.current) {
        detailRef.current.focus();
      }
    }
  };

  // Calculate overlay position and size
  const overlayWidth = Math.max(cellRect.width, 500);
  const overlayHeight = 300;
  const overlayLeft = Math.min(cellRect.left, window.innerWidth - overlayWidth - 20);
  const overlayTop = Math.min(cellRect.top, window.innerHeight - overlayHeight - 20);

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
      {/* Editor overlay */}
      <div
        className={`summary-detail-editor ${className}`}
        style={{
          position: 'fixed',
          top: `${overlayTop}px`,
          left: `${overlayLeft}px`,
          width: `${overlayWidth}px`,
          height: `${overlayHeight}px`,
          padding: 0,
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px var(--shadow-lg)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Summary field (top, single row) */}
        <input
          ref={summaryRef as any}
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'summary')}
          placeholder="Summary"
          style={{
            width: '100%',
            height: 'auto',
            padding: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            fontWeight: '500',
            border: 'none',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {/* Detail field (bottom, full width) */}
        <textarea
          ref={detailRef}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'detail')}
          placeholder="Detail"
          style={{
            width: '100%',
            flex: 1,
            padding: '0.5rem',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
            border: 'none',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            resize: 'none',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            padding: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={handleCancel}
            disabled={isSaving}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              fontWeight: '500',
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

