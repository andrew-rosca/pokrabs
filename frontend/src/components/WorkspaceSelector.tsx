/**
 * WorkspaceSelector Component
 * 
 * A dropdown component for selecting workspaces with:
 * - Search functionality
 * - Most recently used workspaces at the top (3 workspaces)
 * - Remaining workspaces below
 * - Context menu for each workspace (rename, delete)
 * - Create new workspace functionality
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Workspace } from '../../../shared/types';
import { useWorkspace, deleteWorkspace, updateWorkspace, createWorkspace } from '../services/api';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onWorkspaceSelect: (workspaceId: string) => void;
  onWorkspaceCreated?: () => void;
  onWorkspaceDeleted?: () => void;
  onWorkspaceRenamed?: () => void;
}

export function WorkspaceSelector({ 
  workspaces, 
  selectedWorkspaceId, 
  onWorkspaceSelect,
  onWorkspaceCreated,
  onWorkspaceDeleted,
  onWorkspaceRenamed,
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuWorkspaceId, setContextMenuWorkspaceId] = useState<string | null>(null);
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [contextMenuPosition, setContextMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const contextMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  // Sort workspaces: most recently used first
  const sortedWorkspaces = useMemo(() => {
    return [...workspaces].sort((a, b) => {
      const aTime = new Date(a.lastUsedAt).getTime();
      const bTime = new Date(b.lastUsedAt).getTime();
      return bTime - aTime;
    });
  }, [workspaces]);

  // Get 3 most recently used workspaces
  const recentWorkspaces = useMemo(() => {
    return sortedWorkspaces.slice(0, 3);
  }, [sortedWorkspaces]);

  // Get remaining workspaces (excluding the 3 most recent)
  const remainingWorkspaces = useMemo(() => {
    return sortedWorkspaces.slice(3);
  }, [sortedWorkspaces]);

  // Filter workspaces based on search query
  const filteredRecentWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return recentWorkspaces;
    const query = searchQuery.toLowerCase();
    return recentWorkspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(query)
    );
  }, [recentWorkspaces, searchQuery]);

  const filteredRemainingWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return remainingWorkspaces;
    const query = searchQuery.toLowerCase();
    return remainingWorkspaces.filter(workspace => 
      workspace.name.toLowerCase().includes(query)
    );
  }, [remainingWorkspaces, searchQuery]);

  // Calculate dropdown position when opening or when renaming/creating starts
  useEffect(() => {
    if ((isOpen || renamingWorkspaceId || creatingWorkspace) && buttonRef.current) {
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
  }, [isOpen, renamingWorkspaceId, creatingWorkspace]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && !creatingWorkspace && !renamingWorkspaceId) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, creatingWorkspace, renamingWorkspaceId]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingWorkspaceId && renameInputRef.current) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    }
  }, [renamingWorkspaceId]);

  // Focus create input when creating starts
  useEffect(() => {
    if (creatingWorkspace && createInputRef.current) {
      setTimeout(() => {
        createInputRef.current?.focus();
        createInputRef.current?.select();
      }, 0);
    }
  }, [creatingWorkspace]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (dropdownRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      
      // Check context menus - also check if target is inside a context menu by class
      const contextMenuElement = (target as Element).closest?.('.workspace-context-menu');
      if (contextMenuElement) {
        return;
      }
      
      for (const ref of contextMenuRefs.current.values()) {
        if (ref.contains(target)) {
          return;
        }
      }
      
      // Don't close dropdown if we're renaming or creating (input is in the dropdown)
      if (renamingWorkspaceId || creatingWorkspace) {
        return;
      }
      
      setIsOpen(false);
      setSearchQuery(''); // Clear search when closing dropdown
      setContextMenuWorkspaceId(null);
    }
    
    if (isOpen || renamingWorkspaceId || creatingWorkspace) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen, renamingWorkspaceId, creatingWorkspace]);

  // Calculate context menu position when it opens
  useEffect(() => {
    if (contextMenuWorkspaceId) {
      // Use a small delay to ensure refs are set
      const timer = setTimeout(() => {
        const contextMenuButton = contextMenuButtonRefs.current.get(contextMenuWorkspaceId);
        if (contextMenuButton) {
          const buttonRect = contextMenuButton.getBoundingClientRect();
          const menuHeight = 80;
          const menuWidth = 120;
          
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          
          const positionAbove = spaceBelow < menuHeight && spaceAbove > menuHeight;
          const menuTop = positionAbove 
            ? buttonRect.top - menuHeight - 4
            : buttonRect.top;
          
          let menuLeft = buttonRect.right + 4;
          if (menuLeft + menuWidth > window.innerWidth - 10) {
            menuLeft = buttonRect.left - menuWidth - 4;
            if (menuLeft < 10) {
              menuLeft = 10;
            }
          }
          
          setContextMenuPosition({ top: menuTop, left: menuLeft });
        }
      }, 0);
      
      return () => clearTimeout(timer);
    } else {
      setContextMenuPosition(null);
    }
  }, [contextMenuWorkspaceId]);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      for (const ref of contextMenuRefs.current.values()) {
        if (ref.contains(target)) {
          return;
        }
      }
      
      // Check if clicking on the context menu button
      for (const [workspaceId, buttonRef] of contextMenuButtonRefs.current.entries()) {
        if (buttonRef.contains(target)) {
          return;
        }
      }
      
      setContextMenuWorkspaceId(null);
      setContextMenuPosition(null);
    }
    
    if (contextMenuWorkspaceId) {
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [contextMenuWorkspaceId]);

  const handleWorkspaceSelect = async (workspaceId: string) => {
    // Update lastUsedAt
    try {
      await useWorkspace(workspaceId);
    } catch (error) {
      console.error('Failed to update workspace usage:', error);
    }
    
    onWorkspaceSelect(workspaceId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleContextMenu = (e: React.MouseEvent, workspaceId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (contextMenuWorkspaceId === workspaceId) {
      setContextMenuWorkspaceId(null);
      setContextMenuPosition(null);
    } else {
      setContextMenuWorkspaceId(workspaceId);
      // Position will be calculated in useEffect after refs are set
    }
  };

  const handleStartRename = (workspace: Workspace) => {
    // Ensure dropdown stays open when renaming - set this first
    setIsOpen(true);
    setRenamingWorkspaceId(workspace.id);
    setRenameValue(workspace.name);
    setContextMenuWorkspaceId(null);
  };

  const handleCancelRename = () => {
    setRenamingWorkspaceId(null);
    setRenameValue('');
  };

  const handleSaveRename = async (workspaceId: string) => {
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      handleCancelRename();
      return;
    }

    try {
      await updateWorkspace(workspaceId, { name: trimmedName });
      handleCancelRename();
      onWorkspaceRenamed?.();
    } catch (error) {
      console.error('Failed to rename workspace:', error);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) {
      return;
    }

    try {
      await deleteWorkspace(workspaceId);
      setContextMenuWorkspaceId(null);
      onWorkspaceDeleted?.();
      // If deleted workspace was selected, select first available workspace
      if (workspaceId === selectedWorkspaceId) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
        if (remainingWorkspaces.length > 0) {
          onWorkspaceSelect(remainingWorkspaces[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      if (error instanceof Error) {
        alert(`Failed to delete workspace: ${error.message}`);
      }
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, workspaceId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(workspaceId);
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const handleStartCreate = () => {
    setIsOpen(true);
    setCreatingWorkspace(true);
    setCreateValue('');
    setContextMenuWorkspaceId(null);
  };

  const handleCancelCreate = () => {
    setCreatingWorkspace(false);
    setCreateValue('');
  };

  const handleSaveCreate = async () => {
    const trimmedName = createValue.trim();
    if (!trimmedName) {
      handleCancelCreate();
      return;
    }

    try {
      const newWorkspace = await createWorkspace(trimmedName);
      handleCancelCreate();
      onWorkspaceCreated?.();
      // Select the newly created workspace
      onWorkspaceSelect(newWorkspace.id);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
      if (error instanceof Error) {
        alert(`Failed to create workspace: ${error.message}`);
      }
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCreate();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
    }
  };

  // Store refs for workspace items and context menu buttons to calculate context menu position
  const workspaceItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const contextMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const renderWorkspaceItem = (workspace: Workspace) => {
    const isSelected = workspace.id === selectedWorkspaceId;
    const isRenaming = renamingWorkspaceId === workspace.id;
    const showContextMenu = contextMenuWorkspaceId === workspace.id;

    return (
      <div
        key={workspace.id}
        ref={(el) => {
          if (el) {
            workspaceItemRefs.current.set(workspace.id, el);
          } else {
            workspaceItemRefs.current.delete(workspace.id);
          }
        }}
        className={`workspace-item ${isSelected ? 'selected' : ''}`}
        onClick={() => !isRenaming && handleWorkspaceSelect(workspace.id)}
        onContextMenu={(e) => handleContextMenu(e, workspace.id)}
        style={{
          padding: '0.375rem 0.75rem',
          cursor: isRenaming ? 'default' : 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isSelected ? 'var(--bg-hover, rgba(0,0,0,0.05))' : 'transparent',
          fontSize: '0.85rem',
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
            onKeyDown={(e) => handleRenameKeyDown(e, workspace.id)}
            onBlur={() => handleSaveRename(workspace.id)}
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
            <span style={{ flex: 1 }}>{workspace.name}</span>
            <button
              ref={(el) => {
                if (el) {
                  contextMenuButtonRefs.current.set(workspace.id, el);
                } else {
                  contextMenuButtonRefs.current.delete(workspace.id);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, workspace.id);
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
        
        {showContextMenu && !isRenaming && contextMenuPosition && (() => {
          return createPortal(
            <div
              ref={(el) => {
                if (el) {
                  contextMenuRefs.current.set(workspace.id, el);
                } else {
                  contextMenuRefs.current.delete(workspace.id);
                }
              }}
              className="workspace-context-menu"
              style={{
                position: 'fixed',
                top: `${contextMenuPosition.top}px`,
                left: `${contextMenuPosition.left}px`,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                boxShadow: '0 2px 8px var(--shadow-lg)',
                zIndex: 1003,
                minWidth: '120px',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRename(workspace);
                }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
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
            <button
              onClick={() => handleDelete(workspace.id)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-danger, #dc3545)',
                fontSize: '0.85rem',
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
            </div>,
            document.body
          );
        })()}
      </div>
    );
  };

  // Show placeholder if no workspaces
  const displayText = workspaces.length === 0 
    ? 'No workspaces' 
    : (selectedWorkspace?.name || 'Select workspace');

  return (
    <div className="workspace-selector-container" style={{ position: 'relative' }}>
      <span
        ref={buttonRef}
        className="workspace-selector-button"
        data-tutorial="workspace-selector"
        onClick={() => setIsOpen(!isOpen)}
        title={displayText}
        style={{
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '1.125rem',
          fontWeight: 600,
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        {displayText}
      </span>
      
      {(isOpen || renamingWorkspaceId || creatingWorkspace) && createPortal(
        <div 
          ref={dropdownRef}
          className="workspace-selector-dropdown"
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
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
          
          {/* Workspaces list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '320px',
          }}>
            {/* Create Workspace button/input */}
            {creatingWorkspace ? (
              <div style={{
                padding: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <input
                  ref={createInputRef}
                  type="text"
                  placeholder="Workspace name"
                  value={createValue}
                  onChange={(e) => setCreateValue(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  onBlur={handleSaveCreate}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            ) : (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}>
                <button
                  onClick={handleStartCreate}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--accent-color, #3b82f6)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  + Create Workspace
                </button>
              </div>
            )}
            
            {/* Recent workspaces section */}
            {filteredRecentWorkspaces.length > 0 && (
              <div>
                <div style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Recent
                </div>
                {filteredRecentWorkspaces.map(renderWorkspaceItem)}
              </div>
            )}
            
            {/* Remaining workspaces section */}
            {filteredRemainingWorkspaces.length > 0 && (
              <div>
                {filteredRecentWorkspaces.length > 0 && (
                  <div style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: filteredRecentWorkspaces.length > 0 ? '0.5rem' : 0,
                  }}>
                    All Workspaces
                  </div>
                )}
                {filteredRemainingWorkspaces.map(renderWorkspaceItem)}
              </div>
            )}
            
            {/* No results */}
            {filteredRecentWorkspaces.length === 0 && filteredRemainingWorkspaces.length === 0 && searchQuery.trim() && !creatingWorkspace && (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
              }}>
                No workspaces found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

