/**
 * SummaryDetailCell Component
 * 
 * A cell that displays a summary and opens SummaryDetailEditor when clicked.
 * Used for fields that have both summary and detail (problem, objective).
 * 
 * When collapsed but row is expanded by another cell, shows detail content
 * up to available space with fade effect if overflow exists.
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

/** Height of the summary row (approximately 1 line) */
const SUMMARY_HEIGHT = 20;

export function SummaryDetailCell({ value, onSave, className = '', autoOpen = false, onEditorOpened }: SummaryDetailCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hasSpaceForDetail, setHasSpaceForDetail] = useState(false);
  const [cellRect, setCellRect] = useState<DOMRect | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const detailWrapperRef = useRef<HTMLDivElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);

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

  // Check if there's space for detail and if it overflows
  useEffect(() => {
    const checkOverflow = () => {
      if (!isExpanded && cellRef.current) {
        // Check if cell has enough height beyond the summary row
        const cellHeight = cellRef.current.clientHeight;
        const availableSpace = cellHeight - SUMMARY_HEIGHT - 8; // 8px for margins/padding
        setHasSpaceForDetail(availableSpace > 10); // Need at least 10px of space
        
        if (detailWrapperRef.current && detailContentRef.current) {
          const wrapperHeight = detailWrapperRef.current.clientHeight;
          const contentHeight = detailContentRef.current.scrollHeight;
          setHasOverflow(contentHeight > wrapperHeight + 2);
        } else {
          setHasOverflow(false);
        }
      } else {
        setHasOverflow(false);
        setHasSpaceForDetail(false);
      }
    };

    // Delay check to allow DOM to update after expand/collapse toggle
    const timer = setTimeout(checkOverflow, 0);

    // Use ResizeObserver to re-check when cell size changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (cellRef.current) {
      resizeObserver.observe(cellRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [isExpanded, value]);

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
  // Always show caret when there's detail (user might want to expand/collapse)
  const showCaret = showDetail;

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
          flexDirection: 'column',
          position: 'relative',
          padding: '0.25rem 0',
        }}
        title="Click to edit summary and detail"
      >
        {/* Summary row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}>
          <span style={{ flex: 1 }}>
            {summary || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[none]</span>}
          </span>
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
              }}
              title={isExpanded ? 'Collapse detail' : 'Expand detail'}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.95';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.65';
              }}
            >
              {isExpanded ? '⌄' : '>'}
            </button>
          )}
        </div>

        {/* Detail section */}
        {showDetail && isExpanded && (
          // Expanded: show full detail, contributes to row height
          <div
            style={{
              marginTop: '0.25rem',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {linkifyText(detail)}
          </div>
        )}
        {/* Collapsed detail: only render if there's space from another cell expanding */}
        {showDetail && !isExpanded && hasSpaceForDetail && (
          <div
            ref={detailWrapperRef}
            style={{
              position: 'absolute',
              top: `${SUMMARY_HEIGHT + 4}px`, // Below summary
              left: 0,
              right: 0,
              bottom: '0.25rem',
              overflow: 'hidden',
            }}
          >
            <div
              ref={detailContentRef}
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                height: '100%',
                overflow: 'hidden',
                // Use mask-image for fade effect - works with any background
                ...(hasOverflow ? {
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                } : {}),
              }}
            >
              {linkifyText(detail)}
            </div>
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
