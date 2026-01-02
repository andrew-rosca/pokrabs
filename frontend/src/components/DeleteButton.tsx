import { useState, useEffect, useCallback } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';

interface DeleteButtonProps {
  /** Called when deletion is confirmed */
  onDelete: () => void;
  /** Accessible label for the delete button */
  ariaLabel?: string;
  /** Title/tooltip for the delete button */
  title?: string;
  /** Size variant: 'small' for ListEditor, 'default' for main table */
  size?: 'small' | 'default';
  /** Whether to show the button (controlled visibility) */
  visible?: boolean;
}

/**
 * Reusable delete button with confirmation dialog.
 * 
 * Features:
 * - Click shows confirmation dialog (Delete? ✔/✕)
 * - Ctrl+click deletes immediately without confirmation
 * - Escape cancels confirmation
 * - Red button on hover
 * - Configurable size
 */
export function DeleteButton({
  onDelete,
  ariaLabel = 'Delete row',
  title = 'Delete row\nCtrl+click to delete without confirmation',
  size = 'default',
  visible = true,
}: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const buttonSize = size === 'small' ? '20px' : '24px';

  const handleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey) {
      // Ctrl+click: delete immediately without confirmation
      onDelete();
    } else {
      setShowConfirm(true);
    }
  }, [onDelete]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    // On Mac, Ctrl+click triggers context menu instead of click
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      onDelete();
    }
  }, [onDelete]);

  const handleConfirm = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowConfirm(false);
  }, [onDelete]);

  const handleCancel = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  }, []);

  // Handle Escape key to cancel confirmation
  useEffect(() => {
    if (!showConfirm) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowConfirm(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [showConfirm]);

  // Reset confirmation when visibility changes (e.g., mouse leaves)
  useEffect(() => {
    if (!visible) {
      setShowConfirm(false);
    }
  }, [visible]);

  if (!visible && !showConfirm) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="row-action-button row-action-delete"
        aria-label={ariaLabel}
        title={title}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          width: buttonSize,
          height: buttonSize,
        }}
      >
        ×
      </button>
      {showConfirm && (
        <div className="row-delete-confirm" role="alert">
          <span className="row-delete-text">Delete?</span>
          <button
            type="button"
            className="row-action-button row-action-delete confirm"
            aria-label="Confirm delete"
            onClick={handleConfirm}
            title="Confirm delete"
            style={{ width: buttonSize, height: buttonSize }}
          >
            ✔
          </button>
          <button
            type="button"
            className="row-action-button cancel"
            aria-label="Cancel delete"
            onClick={handleCancel}
            title="Cancel delete"
            style={{ width: buttonSize, height: buttonSize }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

