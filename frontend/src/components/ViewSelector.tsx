/**
 * ViewSelector Component
 * 
 * A dropdown component for selecting views with:
 * - Search functionality
 * - Most recently used views at the top (3 views)
 * - Remaining views below
 * - Context menu for each view (rename, delete)
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { View } from '../../../shared/types';
import { useView, deleteView, updateView } from '../services/api';

interface ViewSelectorProps {
  views: View[];
  selectedViewId: string | null;
  onViewSelect: (viewId: string) => void;
  onViewDeleted?: () => void;
  onViewRenamed?: () => void;
}

export function ViewSelector({ 
  views, 
  selectedViewId, 
  onViewSelect,
  onViewDeleted,
  onViewRenamed,
}: ViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuViewId, setContextMenuViewId] = useState<string | null>(null);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const contextMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedView = views.find(v => v.id === selectedViewId);

  // Sort views: most recently used first
  const sortedViews = useMemo(() => {
    return [...views].sort((a, b) => {
      const aTime = new Date(a.lastUsedAt).getTime();
      const bTime = new Date(b.lastUsedAt).getTime();
      return bTime - aTime;
    });
  }, [views]);

  // Get 3 most recently used views
  const recentViews = useMemo(() => {
    return sortedViews.slice(0, 3);
  }, [sortedViews]);

  // Get remaining views (excluding the 3 most recent)
  const remainingViews = useMemo(() => {
    return sortedViews.slice(3);
  }, [sortedViews]);

  // Filter views based on search query
  const filteredRecentViews = useMemo(() => {
    if (!searchQuery.trim()) return recentViews;
    const query = searchQuery.toLowerCase();
    return recentViews.filter(view => 
      view.name.toLowerCase().includes(query)
    );
  }, [recentViews, searchQuery]);

  const filteredRemainingViews = useMemo(() => {
    if (!searchQuery.trim()) return remainingViews;
    const query = searchQuery.toLowerCase();
    return remainingViews.filter(view => 
      view.name.toLowerCase().includes(query)
    );
  }, [remainingViews, searchQuery]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = 400;
      
      let top = rect.bottom + 4;
      let left = rect.left;
      
      const viewportWidth = window.innerWidth;
      if (left + dropdownWidth > viewportWidth) {
        left = rect.right - dropdownWidth;
        if (left < 0) {
          left = 10;
        }
      }
      
      const viewportHeight = window.innerHeight;
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4;
        if (top < 0) {
          top = 10;
        }
      }
      
      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingViewId && renameInputRef.current) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    }
  }, [renamingViewId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (dropdownRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      
      // Check context menus
      for (const ref of contextMenuRefs.current.values()) {
        if (ref.contains(target)) {
          return;
        }
      }
      
      setIsOpen(false);
      setContextMenuViewId(null);
    }
    
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen]);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      for (const ref of contextMenuRefs.current.values()) {
        if (ref.contains(target)) {
          return;
        }
      }
      
      setContextMenuViewId(null);
    }
    
    if (contextMenuViewId) {
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [contextMenuViewId]);

  const handleViewSelect = async (viewId: string) => {
    // Update lastUsedAt
    try {
      await useView(viewId);
    } catch (error) {
      console.error('Failed to update view usage:', error);
    }
    
    onViewSelect(viewId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleContextMenu = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenuViewId(contextMenuViewId === viewId ? null : viewId);
  };

  const handleStartRename = (view: View) => {
    setRenamingViewId(view.id);
    setRenameValue(view.name);
    setContextMenuViewId(null);
  };

  const handleCancelRename = () => {
    setRenamingViewId(null);
    setRenameValue('');
  };

  const handleSaveRename = async (viewId: string) => {
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      handleCancelRename();
      return;
    }

    try {
      await updateView(viewId, { name: trimmedName });
      handleCancelRename();
      onViewRenamed?.();
    } catch (error) {
      console.error('Failed to rename view:', error);
    }
  };

  const handleDelete = async (viewId: string) => {
    if (!confirm('Are you sure you want to delete this view?')) {
      return;
    }

    try {
      await deleteView(viewId);
      setContextMenuViewId(null);
      onViewDeleted?.();
      // If deleted view was selected, select default view
      if (viewId === selectedViewId) {
        const defaultView = views.find(v => v.isDefault);
        if (defaultView) {
          onViewSelect(defaultView.id);
        }
      }
    } catch (error) {
      console.error('Failed to delete view:', error);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, viewId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(viewId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const renderViewItem = (view: View) => {
    const isSelected = view.id === selectedViewId;
    const isRenaming = renamingViewId === view.id;
    const showContextMenu = contextMenuViewId === view.id;

    return (
      <div
        key={view.id}
        className={`view-item ${isSelected ? 'selected' : ''}`}
        onClick={() => !isRenaming && handleViewSelect(view.id)}
        onContextMenu={(e) => handleContextMenu(e, view.id)}
        style={{
          padding: '0.5rem 0.75rem',
          cursor: isRenaming ? 'default' : 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isSelected ? 'var(--bg-hover, rgba(0,0,0,0.05))' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => handleRenameKeyDown(e, view.id)}
            onBlur={() => handleSaveRename(view.id)}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              padding: '0.25rem 0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
        ) : (
          <>
            <span style={{ flex: 1 }}>{view.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, view.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                opacity: 0.6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
              }}
              title="More options"
            >
              ⋮
            </button>
          </>
        )}
        
        {showContextMenu && !isRenaming && (
          <div
            ref={(el) => {
              if (el) {
                contextMenuRefs.current.set(view.id, el);
              } else {
                contextMenuRefs.current.delete(view.id);
              }
            }}
            className="view-context-menu"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '100%',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxShadow: '0 2px 8px var(--shadow-lg)',
              zIndex: 1002,
              minWidth: '120px',
              marginTop: '0.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleStartRename(view)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Rename
            </button>
            {!view.isDefault && (
              <button
                onClick={() => handleDelete(view.id)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-danger, #dc3545)',
                  fontSize: '0.9rem',
                  borderTop: '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Show placeholder if no views
  const displayText = views.length === 0 
    ? 'No views' 
    : (selectedView?.name || 'Select view');

  return (
    <div className="view-selector-container" style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        className="view-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title={displayText}
        disabled={views.length === 0}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          cursor: views.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: views.length === 0 ? 0.6 : 1,
        }}
      >
        <span>{displayText}</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>▼</span>
      </button>
      
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="view-selector-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '300px',
            maxHeight: '400px',
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
        >
          {/* Search input */}
          <div style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search views..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>
          
          {/* Views list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '320px',
          }}>
            {/* Recent views section */}
            {filteredRecentViews.length > 0 && (
              <div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Recent
                </div>
                {filteredRecentViews.map(renderViewItem)}
              </div>
            )}
            
            {/* Remaining views section */}
            {filteredRemainingViews.length > 0 && (
              <div>
                {filteredRecentViews.length > 0 && (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: filteredRecentViews.length > 0 ? '0.5rem' : 0,
                  }}>
                    All Views
                  </div>
                )}
                {filteredRemainingViews.map(renderViewItem)}
              </div>
            )}
            
            {/* No results */}
            {filteredRecentViews.length === 0 && filteredRemainingViews.length === 0 && searchQuery.trim() && (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
              }}>
                No views found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

