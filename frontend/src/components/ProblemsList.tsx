/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 * Supports drag-and-drop reordering - when a problem is dragged,
 * all its children move with it.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem, Status, CreateProblemRequest } from '../../../shared/types';
import { fetchProblems, updateProblem, createProblem, deleteProblem, moveProblem } from '../services/api';
import { SummaryDetailCell } from './SummaryDetailCell';
import { DeleteButton } from './DeleteButton';
import { ListCell } from './ListCell';

interface ProblemsListProps {
  projectId: string;
}

export function ProblemsList({ projectId }: ProblemsListProps) {
  const { problemId: urlProblemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoOpenEditor, setAutoOpenEditor] = useState<{ problemId: string; field: 'problem' | 'objective' } | null>(null);
  
  // Collapse state - set of collapsed problem IDs (children hidden)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // Copy feedback state - tracks which ID was just copied
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Expanded problem details - tracks which problems have their detail sections expanded
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  
  // Highlighted problem - used to flash attention on URL navigation
  const [highlightedProblemId, setHighlightedProblemId] = useState<string | null>(null);
  
  // Ref to track problem rows for scrolling
  const problemRowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  
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

  // Handle URL navigation to specific problem
  useEffect(() => {
    if (!urlProblemId || problems.length === 0) return;

    // Find the problem by ID
    const targetProblem = problems.find(p => p.id === urlProblemId);
    if (!targetProblem) {
      // Problem not found, clear URL
      navigate('/', { replace: true });
      return;
    }

    // Build set of IDs that should be expanded (not collapsed)
    const shouldBeExpanded = new Set<string>();
    
    // Add all ancestor problems to the expanded set
    const pathParts = targetProblem.idPath.split('-');
    for (let i = 0; i < pathParts.length - 1; i++) {
      const ancestorPath = pathParts.slice(0, i + 1).join('-');
      const ancestor = problems.find(p => p.idPath === ancestorPath);
      if (ancestor) {
        shouldBeExpanded.add(ancestor.id);
      }
    }
    
    // Add the target problem to show its children
    shouldBeExpanded.add(targetProblem.id);

    // Collapse all problems except those in shouldBeExpanded
    setCollapsedIds(() => {
      const next = new Set<string>();
      for (const problem of problems) {
        if (hasChildren(problem.id) && !shouldBeExpanded.has(problem.id)) {
          next.add(problem.id);
        }
      }
      return next;
    });

    // Expand the target problem's details (problem and objective fields)
    setExpandedDetails(prev => {
      const next = new Set(prev);
      next.add(`${targetProblem.id}-problem`);
      next.add(`${targetProblem.id}-objective`);
      return next;
    });

    // Scroll to the problem after a brief delay to allow render
    setTimeout(() => {
      const rowElement = problemRowRefs.current.get(targetProblem.id);
      if (rowElement) {
        // Get the scroll container
        const tableContainer = rowElement.closest('.table-container');
        if (tableContainer) {
          // Calculate position with offset for better visibility
          const rowTop = rowElement.offsetTop;
          const offset = 40; // Larger offset to ensure row is fully visible
          tableContainer.scrollTo({
            top: rowTop - offset,
            behavior: 'smooth'
          });
        } else {
          // Fallback to scrollIntoView
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Highlight the row to draw attention
        setHighlightedProblemId(targetProblem.id);
        
        // Clear highlight after animation completes
        setTimeout(() => {
          setHighlightedProblemId(null);
        }, 2000);
      }
    }, 100);
  }, [urlProblemId, problems, navigate]);

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

  // Check if a problem has any children (direct or nested)
  const hasChildren = (problemId: string): boolean => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return false;
    return problems.some(p => p.idPath.startsWith(problem.idPath + '-'));
  };

  // Check if a problem has grandchildren (at least 2 levels of depth below)
  const hasGrandchildren = (problemId: string): boolean => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return false;
    const problemDepth = getDepth(problem.idPath);
    // Find any descendant that is at least 2 levels deeper
    return problems.some(p => 
      p.idPath.startsWith(problem.idPath + '-') && 
      getDepth(p.idPath) >= problemDepth + 2
    );
  };

  // Get all descendant IDs of a problem (children, grandchildren, etc.)
  const getDescendantIds = (problemId: string): Set<string> => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return new Set();
    
    const descendantIds = new Set<string>();
    for (const p of problems) {
      if (p.idPath.startsWith(problem.idPath + '-')) {
        descendantIds.add(p.id);
      }
    }
    return descendantIds;
  };

  // Check if a problem is hidden due to a parent being collapsed
  const isHiddenByCollapse = (problem: Problem): boolean => {
    // Check each ancestor in the idPath to see if it's collapsed
    const pathParts = problem.idPath.split('-');
    // Build ancestor paths and check if any are collapsed
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) { // -1 to skip the problem itself
      currentPath = currentPath ? `${currentPath}-${pathParts[i]}` : pathParts[i];
      // Find the problem with this idPath and check if it's collapsed
      const ancestorProblem = problems.find(p => p.idPath === currentPath);
      if (ancestorProblem && collapsedIds.has(ancestorProblem.id)) {
        return true;
      }
    }
    return false;
  };

  // Toggle collapse for a single problem (show/hide direct children)
  const toggleCollapse = (problemId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  // Expand all descendants (remove from collapsed set)
  const expandAll = (problemId: string) => {
    const descendantIds = getDescendantIds(problemId);
    setCollapsedIds(prev => {
      const next = new Set(prev);
      // Remove this problem and all descendants from collapsed set
      next.delete(problemId);
      for (const id of descendantIds) {
        next.delete(id);
      }
      return next;
    });
  };

  // Collapse all descendants (add all with children to collapsed set)
  const collapseAll = (problemId: string) => {
    const descendantIds = getDescendantIds(problemId);
    setCollapsedIds(prev => {
      const next = new Set(prev);
      // Collapse this problem
      next.add(problemId);
      // Collapse all descendants that have children
      for (const id of descendantIds) {
        if (hasChildren(id)) {
          next.add(id);
        }
      }
      return next;
    });
  };

  // Check if a problem or any of its descendants is collapsed
  const hasCollapsedDescendants = (problemId: string): boolean => {
    const descendantIds = getDescendantIds(problemId);
    for (const id of descendantIds) {
      if (collapsedIds.has(id)) {
        return true;
      }
    }
    return false;
  };

  // Global collapse/expand helpers
  // Get root-level problems (those without a parent in the list)
  const problemIds = new Set(problems.map(p => p.id));
  const rootProblems = problems.filter(p => !p.parentId || !problemIds.has(p.parentId));
  const rootParents = rootProblems.filter(p => hasChildren(p.id));
  
  const anyProblemsHaveChildren = problems.some(p => hasChildren(p.id));
  const anyProblemsHaveGrandchildren = problems.some(p => hasGrandchildren(p.id));
  const allRootParentsCollapsed = rootParents.length > 0 && rootParents.every(p => collapsedIds.has(p.id));
  const anyCollapsed = collapsedIds.size > 0;

  // Single caret: Collapse only root-level parents (hide their immediate children)
  const collapseRootParents = () => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      for (const p of rootParents) {
        next.add(p.id);
      }
      return next;
    });
  };

  // Single caret: Expand only root-level parents (show their immediate children)
  const expandRootParents = () => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      for (const p of rootParents) {
        next.delete(p.id);
      }
      return next;
    });
  };

  // Double caret: Collapse all parents at all levels
  const collapseAllParents = () => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      for (const p of problems) {
        if (hasChildren(p.id)) {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  // Double caret: Expand all parents (show all children)
  const expandAllParents = () => {
    setCollapsedIds(new Set());
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

  // Filter out problems hidden by collapsed parents
  const visibleProblems = sortedProblems.filter(p => !isHiddenByCollapse(p));

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

  // Handle copying problem URL to clipboard
  const handleCopyProblemUrl = async (problemId: string) => {
    try {
      const url = `${window.location.origin}/${problemId}`;
      await navigator.clipboard.writeText(url);
      
      // Show visual feedback
      setCopiedId(problemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
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
              <th title={visibleProblems.length !== problems.length 
                ? `${visibleProblems.length} visible rows / ${problems.length} total rows` 
                : `${visibleProblems.length} total rows`}>
                {visibleProblems.length}{visibleProblems.length !== problems.length && ` / ${problems.length}`}
              </th>
              <th>
                <div className="header-with-action">
                  <span>ID</span>
                  {anyProblemsHaveChildren && (
                    <span className="collapse-controls header-collapse-controls">
                      {/* Single caret: collapse/expand only root-level parents */}
                      <button
                        className="expand-toggle"
                        onClick={(e) => { e.stopPropagation(); allRootParentsCollapsed ? expandRootParents() : collapseRootParents(); }}
                        title={allRootParentsCollapsed ? 'Show all children' : 'Hide all children'}
                        aria-label={allRootParentsCollapsed ? 'Show all children' : 'Hide all children'}
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
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
                      >
                        {allRootParentsCollapsed ? '>' : '⌄'}
                      </button>
                      {/* Double caret: collapse/expand entire tree */}
                      {anyProblemsHaveGrandchildren && (
                        <button
                          className="expand-toggle"
                          onClick={(e) => { e.stopPropagation(); anyCollapsed ? expandAllParents() : collapseAllParents(); }}
                          title={anyCollapsed ? 'Expand entire tree' : 'Collapse entire tree'}
                          aria-label={anyCollapsed ? 'Expand entire tree' : 'Collapse entire tree'}
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
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
                        >
                          {anyCollapsed ? '>>' : '⌄⌄'}
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th>
                <div className="header-with-action">
                  <span>Problem</span>
                  <button
                    className="header-action-button"
                    onClick={() => handleCreateProblem(null, 'top')}
                    title="Add new problem at top"
                  >
                    +
                  </button>
                </div>
              </th>
              <th>Objective</th>
              <th>Key Results</th>
              <th>Actions</th>
              <th>Blockers</th>
              <th>Status</th>
              <th>Votes</th>
            </tr>
          </thead>
          <tbody>
            {visibleProblems.map((problem, index) => {
              const depth = getDepth(problem.idPath);
              const isDragging = draggedProblemId !== null && getDraggedProblems(draggedProblemId).has(problem.id);
              const isDropTarget = dropTargetIndex === index && !isDragging;
              const problemHasChildren = hasChildren(problem.id);
              const problemHasGrandchildren = hasGrandchildren(problem.id);
              const isCollapsed = collapsedIds.has(problem.id);
              const hasNestedCollapsed = hasCollapsedDescendants(problem.id);
              
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
                  ref={(el) => {
                    if (el) {
                      problemRowRefs.current.set(problem.id, el);
                    } else {
                      problemRowRefs.current.delete(problem.id);
                    }
                  }}
                  className={`problem-row depth-${depth}${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}${highlightedProblemId === problem.id ? ' highlighted' : ''}`}
                  style={{
                    opacity: isDragging ? 0.5 : 1,
                    ...dropIndicatorStyle,
                  }}
                  onDragOver={(e) => handleDragOver(e, index, problem)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index, problem)}
                >
                  <td className="row-number">{index + 1}</td>
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
                    <div className="id-content" style={{ paddingLeft: `${depth * 8}px`, position: 'relative' }}>
                      <span 
                        className="id-path clickable"
                        onClick={() => handleCopyProblemUrl(problem.id)}
                        title={copiedId === problem.id ? "Copied!" : "Click to copy link"}
                        style={{ 
                          cursor: 'pointer'
                        }}
                      >
                        {problem.idPath}
                      </span>
                      {copiedId === problem.id && (
                        <span 
                          className="copy-confirmation"
                          style={{
                            position: 'absolute',
                            left: '100%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '3px',
                            boxShadow: '0 1px 3px var(--shadow)',
                            border: '1px solid var(--border-color)',
                            zIndex: 10
                          }}
                        >
                          Link copied to clipboard
                        </span>
                      )}
                      {problemHasChildren && (
                        <span className="collapse-controls">
                          {/* Single caret: toggle immediate children */}
                          <button
                            className="expand-toggle"
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(problem.id); }}
                            title={isCollapsed ? 'Show children' : 'Hide children'}
                            aria-label={isCollapsed ? 'Show children' : 'Hide children'}
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
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
                          >
                            {isCollapsed ? '>' : '⌄'}
                          </button>
                          {/* Double caret: expand/collapse all descendants - only shown for grandchildren */}
                          {problemHasGrandchildren && (
                            <button
                              className="expand-toggle"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (isCollapsed || hasNestedCollapsed) {
                                  expandAll(problem.id);
                                } else {
                                  collapseAll(problem.id);
                                }
                              }}
                              title={isCollapsed || hasNestedCollapsed ? 'Expand entire tree' : 'Collapse entire tree'}
                              aria-label={isCollapsed || hasNestedCollapsed ? 'Expand entire tree' : 'Collapse entire tree'}
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
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.65'; }}
                            >
                              {isCollapsed || hasNestedCollapsed ? '>>' : '⌄⌄'}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="problem-text">
                    <SummaryDetailCell
                      value={problem.problem}
                      onSave={(value) => handleSaveField(problem.id, 'problem', value)}
                      className="problem-text"
                      autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'problem'}
                      onEditorOpened={() => setAutoOpenEditor(null)}
                      forceExpanded={expandedDetails.has(`${problem.id}-problem`)}
                    />
                  </td>
                  <td className="problem-text">
                    <SummaryDetailCell
                      value={problem.objective}
                      onSave={(value) => handleSaveField(problem.id, 'objective', value)}
                      className="problem-text"
                      autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'objective'}
                      onEditorOpened={() => setAutoOpenEditor(null)}
                      forceExpanded={expandedDetails.has(`${problem.id}-objective`)}
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
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell">
                <button
                  className="row-action-button"
                  onClick={() => handleCreateProblem(null, 'bottom')}
                  title="Add new problem at bottom"
                >
                  +
                </button>
              </td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
              <td className="insert-button-cell"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

