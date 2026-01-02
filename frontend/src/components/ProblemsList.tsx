/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 * Supports drag-and-drop reordering - when a problem is dragged,
 * all its children move with it.
 */

import { useEffect, useState, useRef } from 'react';
import { Problem, Status, CreateProblemRequest } from '../../../shared/types';
import { fetchProblems, updateProblem, createProblem, deleteProblem, moveProblem } from '../services/api';
import { SummaryDetailCell } from './SummaryDetailCell';
import { DeleteButton } from './DeleteButton';
import { ListCell } from './ListCell';

interface ProblemsListProps {
  projectId: string;
}

export function ProblemsList({ projectId }: ProblemsListProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoOpenEditor, setAutoOpenEditor] = useState<{ problemId: string; field: 'problem' | 'objective' } | null>(null);
  
  // Drag-and-drop state
  const [draggedProblemId, setDraggedProblemId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const dragOverCountRef = useRef(0);

  useEffect(() => {
    async function loadProblems() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProblems(projectId);
        setProblems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    }

    loadProblems();
  }, [projectId]);

  if (loading) {
    return <div className="loading">Loading problems...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (problems.length === 0) {
    return <div className="empty">No problems found.</div>;
  }

  // Format value back to JSON for saving
  const formatFieldForSave = (fieldName: string, value: string): string => {
    // For problem, objective, and list fields (keyResults, actions, blockers),
    // the value is already JSON from SummaryDetailCell or ListCell
    // So we just pass through the value
    if (fieldName === 'problem' || fieldName === 'objective' ||
        fieldName === 'keyResults' || fieldName === 'actions' || fieldName === 'blockers') {
      return value; // Already JSON from the cell components
    }
    
    return value;
  };

  // Handle saving a field
  const handleSaveField = async (problemId: string, fieldName: string, value: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    const formattedValue = formatFieldForSave(fieldName, value);
    
    // Optimistically update the UI
    setProblems(prevProblems =>
      prevProblems.map(p =>
        p.id === problemId
          ? { ...p, [fieldName]: formattedValue }
          : p
      )
    );

    try {
      // Save to backend
      const updated = await updateProblem(problemId, { [fieldName]: formattedValue });
      
      // Update with server response
      setProblems(prevProblems =>
        prevProblems.map(p =>
          p.id === problemId ? updated : p
        )
      );
    } catch (error) {
      // Revert on error
      const originalProblem = problems.find(p => p.id === problemId);
      if (originalProblem) {
        setProblems(prevProblems =>
          prevProblems.map(p =>
            p.id === problemId ? originalProblem : p
          )
        );
      }
      console.error('Error saving field:', error);
    }
  };

  // Handle status change
  const handleStatusChange = async (problemId: string, newStatus: Status) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    // Optimistically update the UI
    setProblems(prevProblems =>
      prevProblems.map(p =>
        p.id === problemId
          ? { ...p, status: newStatus }
          : p
      )
    );

    try {
      // Save to backend
      const updated = await updateProblem(problemId, { status: newStatus });
      
      // Update with server response
      setProblems(prevProblems =>
        prevProblems.map(p =>
          p.id === problemId ? updated : p
        )
      );
    } catch (error) {
      // Revert on error
      const originalProblem = problems.find(p => p.id === problemId);
      if (originalProblem) {
        setProblems(prevProblems =>
          prevProblems.map(p =>
            p.id === problemId ? originalProblem : p
          )
        );
      }
      console.error('Error updating status:', error);
    }
  };

  // Handle vote increment
  const handleVoteIncrement = async (problemId: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    const newVoteCount = problem.votes + 1;
    
    // Optimistically update the UI
    setProblems(prevProblems =>
      prevProblems.map(p =>
        p.id === problemId
          ? { ...p, votes: newVoteCount }
          : p
      )
    );

    try {
      // Save to backend
      const updated = await updateProblem(problemId, { votes: newVoteCount });
      
      // Update with server response
      setProblems(prevProblems =>
        prevProblems.map(p =>
          p.id === problemId ? updated : p
        )
      );
    } catch (error) {
      // Revert on error
      const originalProblem = problems.find(p => p.id === problemId);
      if (originalProblem) {
        setProblems(prevProblems =>
          prevProblems.map(p =>
            p.id === problemId ? originalProblem : p
          )
        );
      }
      console.error('Error updating votes:', error);
    }
  };

  // Handle deleting a problem
  const handleDeleteProblem = async (problemId: string) => {
    const previousProblems = problems;
    try {
      setError(null);

      // Optimistically remove the problem
      setProblems(prev => prev.filter(p => p.id !== problemId));

      await deleteProblem(problemId);

      // Refresh list to ensure consistent ordering/state from server
      const data = await fetchProblems(projectId);
      setProblems(data);
    } catch (err) {
      // Revert on error
      setProblems(previousProblems);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete problem';
      setError(errorMessage);
      console.error('Error deleting problem:', err);
    }
  };

  // Calculate depth from idPath (count dashes)
  const getDepth = (idPath: string): number => {
    return (idPath.match(/-/g) || []).length;
  };

  // Get status color class
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'Blocked':
        return 'status-blocked';
      case 'In Progress':
        return 'status-in-progress';
      case 'Resolved':
        return 'status-resolved';
      case 'Actionable':
      default:
        return 'status-not-started';
    }
  };

  // Sort problems hierarchically with priority-based sibling ordering
  // This ensures:
  // 1. Parent problems appear before their children
  // 2. Siblings (same parent) are ordered by priority, then by createdAt
  const sortedProblems = (() => {
    // Build a set of all problem IDs for quick lookup
    const problemIds = new Set(problems.map(p => p.id));
    
    // Group problems by parentId
    // Orphaned problems (parent not in list) are treated as root level
    const childrenByParent = new Map<string | null, Problem[]>();
    for (const p of problems) {
      // If parent doesn't exist in the list, treat as root level
      const effectiveParentId = p.parentId && problemIds.has(p.parentId) ? p.parentId : null;
      if (!childrenByParent.has(effectiveParentId)) {
        childrenByParent.set(effectiveParentId, []);
      }
      childrenByParent.get(effectiveParentId)!.push(p);
    }
    
    // Sort each group of siblings by priority, then by createdAt
    for (const children of childrenByParent.values()) {
      children.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // If same priority, sort by createdAt (older first)
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    
    // Build flat list by traversing tree in order (DFS)
    const result: Problem[] = [];
    const traverse = (parentId: string | null) => {
      const children = childrenByParent.get(parentId) || [];
      for (const child of children) {
        result.push(child);
        traverse(child.id);
      }
    };
    traverse(null); // Start from root problems
    
    return result;
  })();

  // Get all problems that would move with the dragged problem (itself + descendants)
  const getDraggedProblems = (problemId: string): Set<string> => {
    const dragged = problems.find(p => p.id === problemId);
    if (!dragged) return new Set();
    
    const draggedSet = new Set<string>();
    for (const p of problems) {
      if (p.idPath === dragged.idPath || p.idPath.startsWith(dragged.idPath + '-')) {
        draggedSet.add(p.id);
      }
    }
    return draggedSet;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, problemId: string) => {
    setDraggedProblemId(problemId);
    dragOverCountRef.current = 0;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', problemId);
    
    // Add a small delay to allow the drag image to be created
    setTimeout(() => {
      // The browser will use the dragged element as the ghost image
    }, 0);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedProblemId(null);
    setDropTargetIndex(null);
    setDropPosition(null);
    dragOverCountRef.current = 0;
  };

  // Handle drag over a row
  const handleDragOver = (e: React.DragEvent, index: number, problem: Problem) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProblemId) return;
    
    // Don't allow dropping on itself or its descendants
    const draggedProblems = getDraggedProblems(draggedProblemId);
    if (draggedProblems.has(problem.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    // Determine drop position based on mouse position within the row
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    let position: 'before' | 'after' | 'child';
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'child'; // Drop as child of this problem
    }
    
    setDropTargetIndex(index);
    setDropPosition(position);
  };

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're leaving the table entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetIndex(null);
      setDropPosition(null);
    }
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, _targetIndex: number, targetProblem: Problem) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProblemId || dropPosition === null) {
      handleDragEnd();
      return;
    }
    
    // Don't allow dropping on itself or its descendants
    const draggedProblems = getDraggedProblems(draggedProblemId);
    if (draggedProblems.has(targetProblem.id)) {
      handleDragEnd();
      return;
    }
    
    try {
      setError(null);
      
      let newParentId: string | null;
      let afterProblemId: string | null;
      
      if (dropPosition === 'child') {
        // Drop as child of target - find last child of target to insert after
        newParentId = targetProblem.id;
        const children = sortedProblems.filter(p => p.parentId === targetProblem.id);
        afterProblemId = children.length > 0 ? children[children.length - 1].id : null;
      } else if (dropPosition === 'before') {
        // Drop before target - same parent as target
        newParentId = targetProblem.parentId;
        // Find the sibling before the target
        const siblings = sortedProblems.filter(p => p.parentId === targetProblem.parentId && !draggedProblems.has(p.id));
        const targetSiblingIndex = siblings.findIndex(p => p.id === targetProblem.id);
        afterProblemId = targetSiblingIndex > 0 ? siblings[targetSiblingIndex - 1].id : null;
      } else {
        // Drop after target - same parent as target
        newParentId = targetProblem.parentId;
        afterProblemId = targetProblem.id;
      }
      
      // Call the API to move the problem
      await moveProblem(draggedProblemId, newParentId, afterProblemId);
      
      // Reload problems to get updated idPaths
      const data = await fetchProblems(projectId);
      setProblems(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move problem';
      setError(errorMessage);
      console.error('Error moving problem:', err);
    } finally {
      handleDragEnd();
    }
  };

  // Handle drop on the "add new" row (drop as root-level at end)
  const handleDropOnNewRow = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProblemId) {
      handleDragEnd();
      return;
    }
    
    try {
      setError(null);
      
      // Drop as root level at the end
      const rootProblems = sortedProblems.filter(p => !p.parentId);
      const lastRootProblem = rootProblems.length > 0 ? rootProblems[rootProblems.length - 1] : null;
      
      await moveProblem(draggedProblemId, null, lastRootProblem?.id ?? null);
      
      const data = await fetchProblems(projectId);
      setProblems(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move problem';
      setError(errorMessage);
      console.error('Error moving problem:', err);
    } finally {
      handleDragEnd();
    }
  };

  // Get siblings of a problem (problems with the same parent)
  const getSiblings = (parentId: string | null): Problem[] => {
    return sortedProblems.filter(p => p.parentId === parentId);
  };

  // Calculate priority for a new problem at top or bottom of sibling list
  const calculatePriority = (parentId: string | null, position: 'top' | 'bottom'): number => {
    const siblings = getSiblings(parentId);
    if (siblings.length === 0) {
      return 0;
    }
    if (position === 'top') {
      // Priority lower than all siblings (min - 1)
      const minPriority = Math.min(...siblings.map(s => s.priority));
      return minPriority - 1;
    } else {
      // Priority higher than all siblings (max + 1)
      const maxPriority = Math.max(...siblings.map(s => s.priority));
      return maxPriority + 1;
    }
  };

  // Handle creating a new problem
  // position: 'top' = first among siblings, 'bottom' = last among siblings
  const handleCreateProblem = async (parentId: string | null, position: 'top' | 'bottom') => {
    try {
      setError(null);
      
      // Calculate priority based on position
      const priority = calculatePriority(parentId, position);

      // Create new problem with default values
      const newProblem: CreateProblemRequest = {
        problem: JSON.stringify({ summary: 'New problem', detail: '' }),
        objective: JSON.stringify({ summary: 'New objective', detail: '' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.NotStarted,
        priority,
        labels: [],
        parentId: parentId || null,
      };

      // Create the problem
      const created = await createProblem(projectId, newProblem);
      
      // Reload problems to get the new one with correct idPath and proper sorting
      const data = await fetchProblems(projectId);
      setProblems(data);
      
      // Auto-open the problem editor for the newly created problem
      setAutoOpenEditor({ problemId: created.id, field: 'problem' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create problem';
      setError(errorMessage);
      console.error('Error creating problem:', err);
    }
  };

  return (
    <div className="problems-list">
      <div className="table-container">
        <table className="problems-table">
          <thead>
            <tr>
              <th>
                <div className="header-with-action">
                  <span>ID</span>
                  <button
                    className="header-action-button"
                    onClick={() => handleCreateProblem(null, 'top')}
                    title="Add new problem at top"
                  >
                    +
                  </button>
                </div>
              </th>
              <th>Problem</th>
              <th>Objective</th>
              <th>Key Results</th>
              <th>Actions</th>
              <th>Blockers</th>
              <th>Status</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {sortedProblems.map((problem, index) => {
              const depth = getDepth(problem.idPath);
              const isDragging = draggedProblemId !== null && getDraggedProblems(draggedProblemId).has(problem.id);
              const isDropTarget = dropTargetIndex === index && !isDragging;
              
              // Determine drop indicator style
              let dropIndicatorStyle: React.CSSProperties = {};
              if (isDropTarget && dropPosition) {
                if (dropPosition === 'before') {
                  dropIndicatorStyle = { boxShadow: 'inset 0 2px 0 var(--accent-color)' };
                } else if (dropPosition === 'after') {
                  dropIndicatorStyle = { boxShadow: 'inset 0 -2px 0 var(--accent-color)' };
                } else if (dropPosition === 'child') {
                  dropIndicatorStyle = { backgroundColor: 'var(--bg-tertiary)' };
                }
              }
              
              return (
                <tr 
                  key={problem.id} 
                  className={`problem-row depth-${depth}${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
                  style={{
                    opacity: isDragging ? 0.5 : 1,
                    ...dropIndicatorStyle,
                  }}
                  onDragOver={(e) => handleDragOver(e, index, problem)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index, problem)}
                >
                  <td className="problem-id">
                    <div className="row-handle-container">
                      <span className="row-handle-indicator">⋮</span>
                      <div 
                        className="row-handle" 
                        title="Drag to reorder"
                        draggable
                        onDragStart={(e) => handleDragStart(e, problem.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: draggedProblemId ? 'grabbing' : 'grab' }}
                      >
                        <span className="handle-icon">⋮⋮</span>
                      </div>
                      <div className="row-actions-panel">
                        <button
                          className="row-action-button"
                          onClick={() => handleCreateProblem(problem.id, 'bottom')}
                          title="Add child problem"
                        >
                          +
                        </button>
                        <DeleteButton
                          onDelete={() => handleDeleteProblem(problem.id)}
                          ariaLabel="Delete problem"
                          title="Delete problem&#10;Ctrl+click to delete without confirmation"
                        />
                      </div>
                    </div>
                    <span className="id-path" style={{ paddingLeft: `${depth * 8}px` }}>
                      {problem.idPath}
                    </span>
                  </td>
                  <td className="problem-text">
                    <SummaryDetailCell
                      value={problem.problem}
                      onSave={(value) => handleSaveField(problem.id, 'problem', value)}
                      className="problem-text"
                      autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'problem'}
                      onEditorOpened={() => setAutoOpenEditor(null)}
                    />
                  </td>
                  <td className="problem-text">
                    <SummaryDetailCell
                      value={problem.objective}
                      onSave={(value) => handleSaveField(problem.id, 'objective', value)}
                      className="problem-text"
                      autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'objective'}
                      onEditorOpened={() => setAutoOpenEditor(null)}
                    />
                  </td>
                  <td className="problem-text">
                    <ListCell
                      value={problem.keyResults}
                      onSave={(value) => handleSaveField(problem.id, 'keyResults', value)}
                      title="Key Results"
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <ListCell
                      value={problem.actions}
                      onSave={(value) => handleSaveField(problem.id, 'actions', value)}
                      title="Actions"
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <ListCell
                      value={problem.blockers}
                      onSave={(value) => handleSaveField(problem.id, 'blockers', value)}
                      title="Blockers"
                      className="problem-text"
                    />
                  </td>
                  <td>
                    <select
                      value={problem.status}
                      onChange={(e) => handleStatusChange(problem.id, e.target.value as Status)}
                      className={`status-select ${getStatusClass(problem.status)}`}
                    >
                      <option value={Status.NotStarted}>Actionable</option>
                      <option value={Status.InProgress}>In Progress</option>
                      <option value={Status.Blocked}>Blocked</option>
                      <option value={Status.Resolved}>Resolved</option>
                    </select>
                  </td>
                  <td className="problem-votes">
                    <button
                      onClick={() => handleVoteIncrement(problem.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Click to increment votes"
                    >
                      {problem.votes}
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Insert button row at bottom for top-level insertion */}
            <tr 
              className="insert-button-row"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={handleDropOnNewRow}
            >
              <td colSpan={8} className="insert-button-cell">
                <button
                  className="row-action-button"
                  onClick={() => handleCreateProblem(null, 'bottom')}
                  title="Add new problem at bottom"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

