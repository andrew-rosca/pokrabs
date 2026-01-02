import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import React from 'react';

interface ListEditorProps {
  items: string[];
  onSave: (items: string[]) => Promise<void> | void;
  onCancel?: () => void;
  title?: string;
  /**
   * Optional anchor rectangle for positioning. If omitted, the editor is centered.
   */
  anchorRect?: DOMRect;
}

function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    parts.push(
      <a
        key={`${url}-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}
      >
        {url}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

/**
 * Minimal, table-like list editor for list fields (actions/blockers).
 * - Light borders, spreadsheet style
 * - Always-available blank row; typing there adds a new item
 * - Row handle on the left to select a row; Delete button removes the selected row
 */
export function ListEditor({ items, onSave, onCancel, title = 'Edit list', anchorRect }: ListEditorProps) {
  const [listItems, setListItems] = useState<string[]>(items);
  const [draftNew, setDraftNew] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const selectAllPendingRef = useRef<boolean>(false);

  // Keep internal state in sync when props change
  useEffect(() => {
    setListItems(items);
    setSelectedIndex(null);
    setDraftNew('');
  }, [items]);

  const sanitizedItems = useMemo(
    () => listItems.map((item) => item.trim()).filter((item) => item.length > 0),
    [listItems],
  );

  const handleRowChange = (index: number, value: string) => {
    setListItems((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleDeleteAt = (index: number) => {
    // Show confirmation dialog
    setPendingDeleteIndex(index);
  };

  const handleConfirmDelete = (index: number) => {
    setListItems((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedIndex(null);
    setPendingDeleteIndex(null);
  };

  const handleCancelDelete = () => {
    setPendingDeleteIndex(null);
  };

  const handleDeleteSelected = () => {
    if (selectedIndex === null) return;
    handleDeleteAt(selectedIndex);
  };

  const handleNewRowCommit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setListItems((prev) => [...prev, trimmed]);
    setDraftNew('');
    setSelectedIndex(listItems.length); // select the newly added row
    setEditingIndex(listItems.length);
    selectAllPendingRef.current = true;
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(sanitizedItems);
    } catch (error) {
      console.error('Failed to save list items:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setListItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedIndex(to);
  };

  const handleBackdropClick = () => {
    onCancel?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // If delete confirmation is open, cancel it first
      if (pendingDeleteIndex !== null) {
        handleCancelDelete();
      } else {
        onCancel?.();
      }
    } else if (e.key === 'Delete' && selectedIndex !== null) {
      e.preventDefault();
      handleDeleteSelected();
    }
  };

  // Focus and select all when entering edit mode
  useEffect(() => {
    if (editingIndex !== null) {
      const contentDiv = contentRefs.current[editingIndex];
      if (contentDiv) {
        contentDiv.focus();
        if (selectAllPendingRef.current) {
          // Select all text in contentEditable
          const range = document.createRange();
          range.selectNodeContents(contentDiv);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          selectAllPendingRef.current = false;
        }
      }
    }
  }, [editingIndex]);

  const overlayWidth = Math.max(anchorRect?.width ?? 500, 420);
  const overlayLeft = anchorRect
    ? Math.min(anchorRect.left, window.innerWidth - overlayWidth - 20)
    : (window.innerWidth - overlayWidth) / 2;
  const overlayTop = anchorRect ? Math.min(anchorRect.top, window.innerHeight - 320) : 96;

  return (
    <>
      <div
        data-testid="list-editor-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'transparent',
        }}
        onClick={handleBackdropClick}
      />
      <div
        className="list-editor"
        style={{
          position: 'fixed',
          top: `${overlayTop}px`,
          left: `${overlayLeft}px`,
          width: `${overlayWidth}px`,
          minHeight: '260px',
          maxHeight: '70vh',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px var(--shadow-lg)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label={title}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.9rem',
            borderBottom: '1px solid var(--border-color)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span>{title}</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIndex === null}
              style={buttonStyle(selectedIndex === null)}
              aria-label="Delete selected row"
            >
              Delete selected
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                ...buttonStyle(isSaving),
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                border: 'none',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {[...listItems, draftNew].map((value, index) => {
            const isNewRow = index === listItems.length;
            const isSelected = selectedIndex === index;
            const displayValue = isNewRow ? draftNew : value;
            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && !isDragging;
            const isEditing = editingIndex === index || isNewRow;

            return (
              <div
                key={`row-${index}`}
                data-testid={isNewRow ? 'new-row' : `list-item-${index + 1}`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-color)',
                  lineHeight: 1,
                  backgroundColor: isDragging
                    ? 'var(--bg-secondary)'
                    : isSelected
                    ? 'var(--bg-hover, rgba(0,0,0,0.04))'
                    : isDropTarget
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                  padding: '4px 0.5rem 4px 1.25rem',
                  minHeight: '18px',
                  boxShadow: isDropTarget ? 'inset 0 2px 0 var(--border-hover)' : undefined,
                  transform: 'none',
                  transition: 'background-color 0.12s ease, box-shadow 0.12s ease',
                  opacity: 1,
                  visibility: 'visible',
                }}
                onDragOver={(e) => {
                  if (dragIndex === null || isNewRow || dragIndex === index) return;
                  e.preventDefault();
                  reorder(dragIndex, index);
                  setDragIndex(index);
                  setDropIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                {/* Handle container - includes both handle and delete button for proper hover */}
                <div
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    paddingLeft: '0.25rem',
                  }}
                >
                  <div
                    role="button"
                    tabIndex={isNewRow ? -1 : 0}
                    aria-label={isNewRow ? 'New row handle' : `Row ${index + 1} handle`}
                    onClick={() => setSelectedIndex(isNewRow ? null : index)}
                    onKeyDown={(e) => {
                      if (isNewRow) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedIndex(index);
                      }
                    }}
                    draggable={!isNewRow}
                    onDragStart={(e) => {
                      if (isNewRow) return;
                      setDragIndex(index);
                      setDropIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    style={{
                      width: '22px',
                      height: '22px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '4px',
                      cursor: isNewRow ? 'default' : dragIndex !== null ? 'grabbing' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      boxShadow: 'none',
                      opacity: hoveredIndex === index ? 1 : 0.8,
                    }}
                  >
                    {!isNewRow && (
                      <span
                        style={{
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        ⋮⋮
                      </span>
                    )}
                  </div>
                  {!isNewRow && (hoveredIndex === index || pendingDeleteIndex === index) && (
                    <>
                      <button
                        type="button"
                        className="row-action-button row-action-delete"
                        aria-label="Delete row"
                        title={"Delete row\nCtrl+click to delete without confirmation"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.ctrlKey) {
                            // Ctrl+click: delete immediately without confirmation
                            handleConfirmDelete(index);
                          } else {
                            handleDeleteAt(index);
                          }
                        }}
                        onContextMenu={(e) => {
                          // On Mac, Ctrl+click triggers context menu instead of click
                          // Handle it here to support Ctrl+click on Mac
                          if (e.ctrlKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleConfirmDelete(index);
                          }
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                        }}
                      >
                        ×
                      </button>
                      {pendingDeleteIndex === index && (
                        <div className="row-delete-confirm" role="alert">
                          <span className="row-delete-text">Delete?</span>
                          <button
                            type="button"
                            className="row-action-button row-action-delete confirm"
                            aria-label="Confirm delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDelete(index);
                            }}
                            title="Confirm delete"
                            style={{ width: '20px', height: '20px' }}
                          >
                            ✔
                          </button>
                          <button
                            type="button"
                            className="row-action-button cancel"
                            aria-label="Cancel delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelDelete();
                            }}
                            title="Cancel delete"
                            style={{ width: '20px', height: '20px' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Single contentEditable div - no element switching, so no height change */}
                <div
                  ref={(el) => {
                    contentRefs.current[index] = el;
                  }}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  aria-label={isNewRow ? 'Add item' : `Item ${index + 1}`}
                  data-placeholder={isNewRow ? 'Add item' : ''}
                  onClick={() => {
                    if (!isEditing) {
                      selectAllPendingRef.current = true;
                      setEditingIndex(index);
                    }
                  }}
                  onBlur={(e) => {
                    const newValue = e.currentTarget.textContent || '';
                    if (isNewRow) {
                      handleNewRowCommit(newValue);
                    } else {
                      handleRowChange(index, newValue);
                    }
                    setEditingIndex(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const newValue = e.currentTarget.textContent || '';
                      if (isNewRow) {
                        handleNewRowCommit(newValue);
                      } else {
                        handleRowChange(index, newValue);
                        setSelectedIndex(index);
                        setEditingIndex(null);
                        e.currentTarget.blur();
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    display: 'block',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.2',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                    cursor: isEditing ? 'text' : 'text',
                    margin: 0,
                    boxSizing: 'border-box',
                    outline: 'none',
                    border: 'none',
                    background: 'transparent',
                    caretColor: 'var(--text-primary)',
                  }}
                >
                  {isEditing ? (
                    displayValue.length === 0 && isNewRow ? null : displayValue
                  ) : (
                    displayValue.trim().length === 0 ? (
                      <span style={{ color: 'var(--text-secondary)' }}>[empty]</span>
                    ) : (
                      linkifyText(displayValue)
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </>
  );
}

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.65rem',
    fontSize: '0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
