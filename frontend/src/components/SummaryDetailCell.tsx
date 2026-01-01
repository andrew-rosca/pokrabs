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
  const [isExpanded, setIsExpanded] = useState(false);
  const [cellRect, setCellRect] = useState<DOMRect | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Parse the JSON to get summary and detail
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

  const getDetail = (): string => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed.detail !== undefined) {
        return parsed.detail || '';
      }
      return '';
    } catch {
      return '';
    }
  };

  // Convert URLs in text to clickable links
  const linkifyText = (text: string): React.ReactNode => {
    // URL regex pattern - matches http://, https://, and www. URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the link
      const url = match[0];
      const href = url.startsWith('http') ? url : `https://${url}`;
      parts.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: 'var(--accent-color)',
            textDecoration: 'underline',
          }}
        >
          {url}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no URLs found, return original text
    if (parts.length === 0) {
      return text;
    }

    return <>{parts}</>;
  };

  const hasDetail = (): boolean => {
    const detail = getDetail();
    return detail.trim().length > 0;
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

  const handleClick = (e: React.MouseEvent) => {
    // Don't open editor if clicking on the expand button
    if ((e.target as HTMLElement).closest('.expand-toggle')) {
      return;
    }
    openEditor();
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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
  const detail = getDetail();
  const showDetail = hasDetail();

  return (
    <>
      <div
        ref={cellRef}
        onClick={handleClick}
        className={`summary-detail-cell editable-cell ${className}`}
        style={{
          cursor: 'text',
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '0.25rem 0',
        }}
        title="Click to edit summary and detail"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}>
          <span style={{ flex: 1 }}>
            {summary || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[none]</span>}
          </span>
          {showDetail && (
            <button
              className="expand-toggle"
              onClick={handleExpandToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.125rem 0.25rem',
                fontSize: '0.625rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
              }}
              title={isExpanded ? 'Collapse detail' : 'Expand detail'}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>
        {isExpanded && showDetail && (
          <div
            style={{
              marginTop: '0.25rem',
              paddingTop: '0.25rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {linkifyText(detail)}
          </div>
        )}
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

