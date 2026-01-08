/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 * Supports drag-and-drop reordering - when a problem is dragged,
 * all its children move with it.
 */

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem, Status, CreateProblemRequest, ViewFilters } from '../../../shared/types';
import { fetchProblems, updateProblem, createProblem, deleteProblem, moveProblem } from '../services/api';
import { SummaryDetailCell } from './SummaryDetailCell';
import { DeleteButton } from './DeleteButton';
import { ListCell } from './ListCell';
import { StatusFilter } from './StatusFilter';
import { LabelFilter } from './LabelFilter';
import { LabelCell } from './LabelCell';

interface ProblemsListProps {
  workspaceId: string;
  searchQuery?: string;
  viewFilters?: ViewFilters | null;
  onFiltersChange?: (filters: ViewFilters) => void;
}

export function ProblemsList({ 
  workspaceId, 
  searchQuery: externalSearchQuery,
  viewFilters,
  onFiltersChange,
}: ProblemsListProps) {
  const { workspaceId: urlWorkspaceId, viewId: urlViewId, problemId: urlProblemId } = useParams<{ 
    workspaceId?: string;
    viewId?: string;
    problemId?: string;
  }>();
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
  
  // Search/filter state - use external search if provided, otherwise use local state
  const [localSearchQuery] = useState<string>('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  
  // Drag-and-drop state
  const [draggedProblemId, setDraggedProblemId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const dragOverCountRef = useRef(0);
  
  // Pending move operation (when parent change requires confirmation)
  const [pendingMove, setPendingMove] = useState<{
    problemId: string;
    newParentId: string | null;
    afterProblemId: string | null;
  } | null>(null);

  // Reorder position input state
  const [showPositionInput, setShowPositionInput] = useState<string | null>(null); // problem ID
  const [positionInputValue, setPositionInputValue] = useState<string>('');
  const positionInputRef = useRef<HTMLInputElement>(null);

  // Column visibility state - persisted to localStorage
  // Note: votes column hidden until user authentication is implemented (voting requires user identity)
  const [visibleColumns, setVisibleColumns] = useState<{
    labels: boolean;
    objective: boolean;
    keyResults: boolean;
    actions: boolean;
    blockers: boolean;
    status: boolean;
    votes: boolean;
  }>(() => {
    const stored = localStorage.getItem('pokrabs-column-visibility');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Default votes to false if not present in stored config
        return { ...parsed, labels: parsed.labels ?? true, votes: parsed.votes ?? false };
      } catch {
        return { labels: true, objective: true, keyResults: true, actions: true, blockers: true, status: true, votes: false };
      }
    }
    return { labels: true, objective: true, keyResults: true, actions: true, blockers: true, status: true, votes: false };
  });

  // Status filter state - use viewFilters if provided, otherwise fallback to localStorage
  const [selectedStatuses, setSelectedStatuses] = useState<Set<Status>>(() => {
    if (viewFilters) {
      return new Set(viewFilters.selectedStatuses as Status[]);
    }
    const stored = localStorage.getItem('pokrabs-status-filter');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch {
        return new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
      }
    }
    return new Set([Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved]);
  });

  // Label filter state - use viewFilters if provided, otherwise fallback to localStorage
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(() => {
    if (viewFilters) {
      return new Set(viewFilters.selectedLabels);
    }
    const stored = localStorage.getItem('pokrabs-label-filter');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Sync with viewFilters when they change
  useEffect(() => {
    if (viewFilters) {
      setSelectedStatuses(new Set(viewFilters.selectedStatuses as Status[]));
      setSelectedLabels(new Set(viewFilters.selectedLabels));
    }
  }, [viewFilters]);

  // Persist column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('pokrabs-column-visibility', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Persist status filter to localStorage (only when not using viewFilters)
  useEffect(() => {
    if (!viewFilters) {
      localStorage.setItem('pokrabs-status-filter', JSON.stringify(Array.from(selectedStatuses)));
    }
  }, [selectedStatuses, viewFilters]);

  // Persist label filter to localStorage (only when not using viewFilters)
  useEffect(() => {
    if (!viewFilters) {
      localStorage.setItem('pokrabs-label-filter', JSON.stringify(Array.from(selectedLabels)));
    }
  }, [selectedLabels, viewFilters]);

  // Handle Escape key to cancel pending move
  useEffect(() => {
    if (!pendingMove) return;
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setPendingMove(null);
        // Reset drag state
        setDraggedProblemId(null);
        setDropTargetIndex(null);
        setDropPosition(null);
        dragOverCountRef.current = 0;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [pendingMove]);

  // Toggle column visibility
  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  // Handle status filter change
  const handleStatusFilterChange = (statuses: Set<Status>) => {
    setSelectedStatuses(statuses);
    if (onFiltersChange) {
      onFiltersChange({
        selectedStatuses: Array.from(statuses),
        selectedLabels: Array.from(selectedLabels),
      });
    }
  };

  // Handle label filter change
  const handleLabelFilterChange = (labels: Set<string>) => {
    setSelectedLabels(labels);
    if (onFiltersChange) {
      onFiltersChange({
        selectedStatuses: Array.from(selectedStatuses),
        selectedLabels: Array.from(labels),
      });
    }
  };

  // Auto-select the position input field when it opens
  useEffect(() => {
    if (showPositionInput && positionInputRef.current) {
      positionInputRef.current.select();
    }
  }, [showPositionInput]);

  useEffect(() => {
    async function loadProblems() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProblems(workspaceId);
        setProblems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    }

    loadProblems();
  }, [workspaceId]);

  // Helper function to clear URL if taking action on a different problem
  const clearUrlIfDifferentProblem = (actionProblemId: string) => {
    if (urlProblemId && urlProblemId !== actionProblemId) {
      // Clear problem segment but keep workspace and view
      if (urlWorkspaceId && urlViewId) {
        navigate(`/w/${urlWorkspaceId}/v/${urlViewId}`, { replace: true });
      } else if (urlWorkspaceId) {
        navigate(`/w/${urlWorkspaceId}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  // Handle URL navigation to specific problem
  useEffect(() => {
    if (!urlProblemId || problems.length === 0) return;

    // Find the problem by ID
    const targetProblem = problems.find(p => p.id === urlProblemId);
    if (!targetProblem) {
      // Problem not found, clear problem segment but keep workspace/view
      if (urlWorkspaceId && urlViewId) {
        navigate(`/w/${urlWorkspaceId}/v/${urlViewId}`, { replace: true });
      } else if (urlWorkspaceId) {
        navigate(`/w/${urlWorkspaceId}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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

  // Format value back to JSON for saving
  const formatFieldForSave = (fieldName: string, value: string): string => {
    // For problem, objective, and list fields (keyResults, actions, blockers),
    // the value is already JSON from SummaryDetailCell or ListCell
    // So we just pass through the value
    if (fieldName === 'problem' || fieldName === 'objective' ||
        fieldName === 'keyResults' || fieldName === 'actions' || fieldName === 'blockers') {
      return value; // Already JSON from the cell components
    }
    
    // For labels, convert comma-separated string to JSON array
    if (fieldName === 'labels') {
      const labelsArray = value.split(',').map(l => l.trim()).filter(l => l.length > 0);
      return JSON.stringify(labelsArray);
    }
    
    return value;
  };

  // Handle saving a field
  const handleSaveField = async (problemId: string, fieldName: string, value: string) => {
    clearUrlIfDifferentProblem(problemId);
    
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    const formattedValue = formatFieldForSave(fieldName, value);
    
    // For labels, convert to array for optimistic update
    let updateData: any = { [fieldName]: formattedValue };
    if (fieldName === 'labels') {
      const labelsArray = JSON.parse(formattedValue);
      updateData.labels = labelsArray;
    }
    
    // Optimistically update the UI
    setProblems(prevProblems =>
      prevProblems.map(p =>
        p.id === problemId
          ? { ...p, ...updateData }
          : p
      )
    );

    try {
      // Save to backend - for labels, send as array directly
      let backendUpdate: any = { [fieldName]: formattedValue };
      if (fieldName === 'labels') {
        backendUpdate.labels = JSON.parse(formattedValue);
      }
      const updated = await updateProblem(problemId, backendUpdate);
      
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
    clearUrlIfDifferentProblem(problemId);
    
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
    clearUrlIfDifferentProblem(problemId);
    
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
    clearUrlIfDifferentProblem(problemId);
    
    const previousProblems = problems;
    try {
      setError(null);

      // Optimistically remove the problem
      setProblems(prev => prev.filter(p => p.id !== problemId));

      await deleteProblem(problemId);

      // Refresh list to ensure consistent ordering/state from server
      const data = await fetchProblems(workspaceId);
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
    clearUrlIfDifferentProblem(problemId);
    
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
    clearUrlIfDifferentProblem(problemId);
    
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
    clearUrlIfDifferentProblem(problemId);
    
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

  // Get all unique labels from all problems for predefined labels
  const predefinedLabels = (() => {
    const allLabels = new Set<string>();
    for (const problem of problems) {
      if (problem.labels && problem.labels.length > 0) {
        for (const label of problem.labels) {
          allLabels.add(label);
        }
      }
    }
    return Array.from(allLabels).sort();
  })();

  // Filter out problems hidden by collapsed parents
  const visibleProblems = (() => {
    // First, apply search filter if query exists
    let filtered = sortedProblems;
    
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = sortedProblems.filter(problem => {
        return (
          problem.id.toLowerCase().includes(searchLower) ||
          problem.idPath.toLowerCase().includes(searchLower) ||
          problem.problem?.toLowerCase().includes(searchLower) ||
          problem.objective?.toLowerCase().includes(searchLower) ||
          problem.keyResults?.toLowerCase().includes(searchLower) ||
          problem.actions?.toLowerCase().includes(searchLower) ||
          problem.blockers?.toLowerCase().includes(searchLower) ||
          problem.labels?.some(label => label.toLowerCase().includes(searchLower))
        );
      });
      
      // When searching, show all matching problems regardless of collapse state
      // Apply status filter
      filtered = filtered.filter(p => selectedStatuses.has(p.status));
      // Apply label filter
      if (selectedLabels.size > 0) {
        filtered = filtered.filter(p => 
          p.labels && p.labels.length > 0 && 
          p.labels.some(label => selectedLabels.has(label))
        );
      }
      return filtered;
    }
    
    // Apply status filter
    filtered = filtered.filter(p => selectedStatuses.has(p.status));
    
    // Apply label filter
    if (selectedLabels.size > 0) {
      filtered = filtered.filter(p => 
        p.labels && p.labels.length > 0 && 
        p.labels.some(label => selectedLabels.has(label))
      );
    }
    
    // When not searching, filter out problems hidden by collapsed parents
    return filtered.filter(p => !isHiddenByCollapse(p));
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

  // Execute the actual move operation
  const executeMove = async (problemId: string, newParentId: string | null, afterProblemId: string | null) => {
    try {
      setError(null);
      
      // Call the API to move the problem
      await moveProblem(problemId, newParentId, afterProblemId);
      
      // Reload problems to get updated idPaths
      const data = await fetchProblems(workspaceId);
      setProblems(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move problem';
      setError(errorMessage);
      console.error('Error moving problem:', err);
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
    
    // Clear URL if dragging a different problem
    clearUrlIfDifferentProblem(draggedProblemId);
    
    // Don't allow dropping on itself or its descendants
    const draggedProblems = getDraggedProblems(draggedProblemId);
    if (draggedProblems.has(targetProblem.id)) {
      handleDragEnd();
      return;
    }
    
    // Find the dragged problem to check its current parent
    const draggedProblem = problems.find(p => p.id === draggedProblemId);
    if (!draggedProblem) {
      handleDragEnd();
      return;
    }
    
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
    
    // Check if parent is changing
    const currentParentId = draggedProblem.parentId;
    const parentIsChanging = currentParentId !== newParentId;
    
    if (parentIsChanging) {
      // Parent is changing - show confirmation dialog
      setPendingMove({ problemId: draggedProblemId, newParentId, afterProblemId });
      // Don't call handleDragEnd yet - keep drag state until confirmation
      return;
    }
    
    // Parent is not changing - just reordering, proceed immediately
    await executeMove(draggedProblemId, newParentId, afterProblemId);
    handleDragEnd();
  };

  // Handle drop on the "add new" row (drop as root-level at end)
  const handleDropOnNewRow = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedProblemId) {
      handleDragEnd();
      return;
    }
    
    // Find the dragged problem to check its current parent
    const draggedProblem = problems.find(p => p.id === draggedProblemId);
    if (!draggedProblem) {
      handleDragEnd();
      return;
    }
    
    // Drop as root level at the end
    const rootProblems = sortedProblems.filter(p => !p.parentId);
    const lastRootProblem = rootProblems.length > 0 ? rootProblems[rootProblems.length - 1] : null;
    const newParentId: string | null = null;
    
    // Check if parent is changing
    const currentParentId = draggedProblem.parentId;
    const parentIsChanging = currentParentId !== newParentId;
    
    if (parentIsChanging) {
      // Parent is changing - show confirmation dialog
      setPendingMove({ problemId: draggedProblemId, newParentId, afterProblemId: lastRootProblem?.id ?? null });
      // Don't call handleDragEnd yet - keep drag state until confirmation
      return;
    }
    
    // Parent is not changing - just reordering, proceed immediately
    await executeMove(draggedProblemId, newParentId, lastRootProblem?.id ?? null);
    handleDragEnd();
  };
  
  // Handle confirming a pending move (parent change)
  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    
    await executeMove(pendingMove.problemId, pendingMove.newParentId, pendingMove.afterProblemId);
    setPendingMove(null);
    handleDragEnd();
  };
  
  // Handle canceling a pending move
  const handleCancelMove = () => {
    setPendingMove(null);
    handleDragEnd();
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
      // Use workspaceId and viewId from URL params, fallback to props/state if needed
      const wsId = urlWorkspaceId || workspaceId;
      const vId = urlViewId;
      
      if (!wsId || !vId) {
        console.error('Cannot copy problem URL: missing workspaceId or viewId');
        return;
      }
      
      const url = `${window.location.origin}/w/${wsId}/v/${vId}/p/${problemId}`;
      await navigator.clipboard.writeText(url);
      
      // Show visual feedback
      setCopiedId(problemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  // Handle reordering a problem to top or bottom of visible list
  const handleReorder = async (problemId: string, position: 'top' | 'bottom') => {
    clearUrlIfDifferentProblem(problemId);
    
    try {
      setError(null);
      
      if (position === 'top') {
        // Move to very first position (before first visible problem)
        const firstProblem = visibleProblems[0];
        await moveProblem(problemId, firstProblem.parentId, null);
      } else {
        // Move to very last position (after last visible problem)
        const lastProblem = visibleProblems[visibleProblems.length - 1];
        await moveProblem(problemId, lastProblem.parentId, lastProblem.id);
      }
      
      // Reload problems to get updated priorities
      const data = await fetchProblems(workspaceId);
      setProblems(data);
      
      // Highlight the row to draw attention (without scrolling)
      setHighlightedProblemId(problemId);
      
      // Clear highlight after animation completes
      setTimeout(() => {
        setHighlightedProblemId(null);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder problem';
      setError(errorMessage);
      console.error('Error reordering problem:', err);
    }
  };

  // Handle showing the position input for a problem
  const handleShowPositionInput = (problemId: string) => {
    // Calculate middle position of visible problems (visible row numbers)
    const middlePosition = Math.ceil(visibleProblems.length / 2);
    
    setPositionInputValue(middlePosition.toString());
    setShowPositionInput(problemId);
  };

  // Handle reordering to a specific visible row position
  const handleReorderToPosition = async (problemId: string) => {
    clearUrlIfDifferentProblem(problemId);
    
    const targetRowNumber = parseInt(positionInputValue, 10);
    
    if (isNaN(targetRowNumber) || targetRowNumber < 1) {
      setError('Please enter a valid row number (1 or greater)');
      return;
    }

    if (targetRowNumber > visibleProblems.length + 1) {
      setError(`Row number must be between 1 and ${visibleProblems.length + 1}`);
      return;
    }

    try {
      setError(null);
      setShowPositionInput(null);
      
      // Convert 1-based row number to 0-based index
      const targetIndex = targetRowNumber - 1;
      
      // Determine the new parent and position based on visible row number
      // We want to insert the problem at the target visible row position
      
      if (targetIndex === 0) {
        // Move to very first position (before first visible problem)
        const firstProblem = visibleProblems[0];
        await moveProblem(problemId, firstProblem.parentId, null);
      } else if (targetIndex >= visibleProblems.length) {
        // Move to very last position (after last visible problem)
        const lastProblem = visibleProblems[visibleProblems.length - 1];
        await moveProblem(problemId, lastProblem.parentId, lastProblem.id);
      } else {
        // Insert after the problem at targetIndex - 1
        const afterProblem = visibleProblems[targetIndex - 1];
        await moveProblem(problemId, afterProblem.parentId, afterProblem.id);
      }
      
      // Reload problems to get updated priorities
      const data = await fetchProblems(workspaceId);
      setProblems(data);
      
      // Highlight the row to draw attention (without scrolling)
      setHighlightedProblemId(problemId);
      
      // Clear highlight after animation completes
      setTimeout(() => {
        setHighlightedProblemId(null);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder problem';
      setError(errorMessage);
      console.error('Error reordering problem:', err);
    }
  };

  // Handle canceling position input
  const handleCancelPositionInput = () => {
    setShowPositionInput(null);
    setPositionInputValue('');
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
      const created = await createProblem(workspaceId, newProblem);
      
      // Reload problems to get the new one with correct idPath and proper sorting
      const data = await fetchProblems(workspaceId);
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
    <div className="problems-list" data-tutorial="problems-list">
      {/* Parent change confirmation dialog */}
      {pendingMove && createPortal(
        <>
          <div
            className="parent-change-confirm-overlay"
            onClick={handleCancelMove}
          />
          <div
            className="parent-change-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="parent-change-title"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelMove();
              }
            }}
          >
            <div className="parent-change-confirm-content">
              <div id="parent-change-title" className="parent-change-title">Change parent?</div>
              <div className="parent-change-message">
                This will move the problem and all its children to a different parent. Are you sure?
              </div>
              <div className="parent-change-actions">
                <button
                  type="button"
                  className="row-action-button confirm"
                  aria-label="Confirm move"
                  onClick={handleConfirmMove}
                  title="Confirm move"
                >
                  ✔
                </button>
                <button
                  type="button"
                  className="row-action-button cancel"
                  aria-label="Cancel move"
                  onClick={handleCancelMove}
                  title="Cancel move"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
      <div className="table-container">
        <table className="problems-table" data-tutorial="problems-table">
          <thead data-tutorial="problems-table-header">
            <tr>
              <th title={`${visibleProblems.length} visible rows / ${problems.length} total rows`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                  <span>{visibleProblems.length}</span>
                  <span className="total-count">{problems.length}</span>
                </div>
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
              <th style={{ paddingLeft: 0 }}>
                <div className="header-with-action" style={{ justifyContent: 'space-between' }}>
                  <div className="header-with-action">
                    <span>Problem</span>
                    <button
                      className="header-action-button"
                      data-tutorial="add-problem-header"
                      onClick={() => handleCreateProblem(null, 'top')}
                      title="Add new problem at top"
                    >
                      +
                    </button>
                  </div>
                  <div className="column-visibility-toggles" data-tutorial="column-visibility-toggles">
                    <button
                      className={`column-toggle-button ${visibleColumns.labels ? 'active' : 'inactive'}`}
                      data-tutorial="toggle-column"
                      onClick={() => toggleColumn('labels')}
                      title={`${visibleColumns.labels ? 'Hide' : 'Show'} Labels column`}
                      aria-label={`${visibleColumns.labels ? 'Hide' : 'Show'} Labels column`}
                    >
                      L
                    </button>
                    <button
                      className={`column-toggle-button ${visibleColumns.objective ? 'active' : 'inactive'}`}
                      onClick={() => toggleColumn('objective')}
                      title={`${visibleColumns.objective ? 'Hide' : 'Show'} Objective column`}
                      aria-label={`${visibleColumns.objective ? 'Hide' : 'Show'} Objective column`}
                    >
                      O
                    </button>
                    <button
                      className={`column-toggle-button ${visibleColumns.keyResults ? 'active' : 'inactive'}`}
                      onClick={() => toggleColumn('keyResults')}
                      title={`${visibleColumns.keyResults ? 'Hide' : 'Show'} Key Results column`}
                      aria-label={`${visibleColumns.keyResults ? 'Hide' : 'Show'} Key Results column`}
                    >
                      K
                    </button>
                    <button
                      className={`column-toggle-button ${visibleColumns.actions ? 'active' : 'inactive'}`}
                      onClick={() => toggleColumn('actions')}
                      title={`${visibleColumns.actions ? 'Hide' : 'Show'} Actions column`}
                      aria-label={`${visibleColumns.actions ? 'Hide' : 'Show'} Actions column`}
                    >
                      A
                    </button>
                    <button
                      className={`column-toggle-button ${visibleColumns.blockers ? 'active' : 'inactive'}`}
                      onClick={() => toggleColumn('blockers')}
                      title={`${visibleColumns.blockers ? 'Hide' : 'Show'} Blockers column`}
                      aria-label={`${visibleColumns.blockers ? 'Hide' : 'Show'} Blockers column`}
                    >
                      B
                    </button>
                    <button
                      className={`column-toggle-button ${visibleColumns.status ? 'active' : 'inactive'}`}
                      onClick={() => toggleColumn('status')}
                      title={`${visibleColumns.status ? 'Hide' : 'Show'} Status column`}
                      aria-label={`${visibleColumns.status ? 'Hide' : 'Show'} Status column`}
                    >
                      S
                    </button>
                  </div>
                </div>
              </th>
              {visibleColumns.labels && (
                <th>
                  <div className="header-with-action">
                    <span>Labels</span>
                    <LabelFilter
                      selectedLabels={selectedLabels}
                      predefinedLabels={predefinedLabels}
                      onFilterChange={handleLabelFilterChange}
                    />
                  </div>
                </th>
              )}
              {visibleColumns.objective && <th>Objective</th>}
              {visibleColumns.keyResults && <th>Key Results</th>}
              {visibleColumns.actions && <th>Actions</th>}
              {visibleColumns.blockers && <th>Blockers</th>}
              {visibleColumns.status && (
                <th>
                  <div className="header-with-action">
                    <span>Status</span>
                    <StatusFilter
                      selectedStatuses={selectedStatuses}
                      onFilterChange={handleStatusFilterChange}
                    />
                  </div>
                </th>
              )}
              {visibleColumns.votes && <th>Votes</th>}
            </tr>
          </thead>
          <tbody>
            {visibleProblems.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={
                  2 + // Row number + ID
                  (visibleColumns.labels ? 1 : 0) +
                  (visibleColumns.objective ? 1 : 0) +
                  (visibleColumns.keyResults ? 1 : 0) +
                  (visibleColumns.actions ? 1 : 0) +
                  (visibleColumns.blockers ? 1 : 0) +
                  (visibleColumns.status ? 1 : 0) +
                  (visibleColumns.votes ? 1 : 0) +
                  1 // Problem column (always visible)
                } style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No problems found.
                </td>
              </tr>
            )}
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
                  data-depth={depth}
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
                        data-tutorial="row-actions-panel"
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
                          data-tutorial="add-child-problem"
                          onClick={() => handleCreateProblem(problem.id, 'bottom')}
                          title="Add child problem"
                        >
                          +
                        </button>
                        <button
                          className="row-action-button row-action-reorder"
                          onClick={() => handleReorder(problem.id, 'top')}
                          title="Move to top"
                        >
                          ⤊
                        </button>
                        <button
                          className="row-action-button row-action-reorder"
                          onClick={() => handleReorder(problem.id, 'bottom')}
                          title="Move to bottom"
                        >
                          ⤋
                        </button>
                        <button
                          className="row-action-button row-action-reorder"
                          onClick={() => handleShowPositionInput(problem.id)}
                          title="Move to position..."
                        >
                          #
                        </button>
                        <DeleteButton
                          onDelete={() => handleDeleteProblem(problem.id)}
                          ariaLabel="Delete problem"
                          title="Delete problem&#10;Ctrl+click to delete without confirmation"
                        />
                      </div>
                      {showPositionInput === problem.id && (
                        <div className="row-position-input" role="dialog">
                          <span className="row-position-text">Position:</span>
                          <input
                            ref={positionInputRef}
                            type="number"
                            className="position-input-field"
                            value={positionInputValue}
                            onChange={(e) => setPositionInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleReorderToPosition(problem.id);
                              } else if (e.key === 'Escape') {
                                handleCancelPositionInput();
                              }
                            }}
                            autoFocus
                            min="1"
                          />
                          <button
                            type="button"
                            className="row-action-button confirm"
                            aria-label="Confirm position"
                            onClick={() => handleReorderToPosition(problem.id)}
                            title="Move to position"
                          >
                            ✔
                          </button>
                          <button
                            type="button"
                            className="row-action-button cancel"
                            aria-label="Cancel"
                            onClick={handleCancelPositionInput}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="id-content" style={{ position: 'relative' }}>
                      <span 
                        className="id-path clickable"
                        data-tutorial="copy-problem-url"
                        onClick={() => handleCopyProblemUrl(problem.id)}
                        title={copiedId === problem.id ? "Copied!" : "Click to copy link"}
                        style={{ 
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
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
                        <span className="collapse-controls" data-tutorial="id-collapse-controls">
                          {/* Single caret: toggle immediate children */}
                          <button
                            className="expand-toggle"
                            data-tutorial="toggle-id-collapse"
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
                  <td className="problem-text" style={{ paddingLeft: depth > 0 ? `calc(${depth} * 0.5rem + 0.5rem)` : '0' }}>
                    <SummaryDetailCell
                      value={problem.problem}
                      onSave={(value) => handleSaveField(problem.id, 'problem', value)}
                      className="problem-text"
                      autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'problem'}
                      onEditorOpened={() => setAutoOpenEditor(null)}
                      forceExpanded={expandedDetails.has(`${problem.id}-problem`)}
                      problemId={problem.id}
                    />
                  </td>
                  {visibleColumns.labels && (
                    <td className="problem-text">
                      <LabelCell
                        labels={problem.labels || []}
                        predefinedLabels={predefinedLabels}
                        onSave={async (newLabels: string[]) => {
                          // Convert array to comma-separated string for handleSaveField
                          const value = newLabels.join(', ');
                          await handleSaveField(problem.id, 'labels', value);
                        }}
                        className="problem-text"
                      />
                    </td>
                  )}
                  {visibleColumns.objective && (
                    <td className="problem-text">
                      <SummaryDetailCell
                        value={problem.objective}
                        onSave={(value) => handleSaveField(problem.id, 'objective', value)}
                        className="problem-text"
                        autoOpen={autoOpenEditor?.problemId === problem.id && autoOpenEditor?.field === 'objective'}
                        onEditorOpened={() => setAutoOpenEditor(null)}
                        forceExpanded={expandedDetails.has(`${problem.id}-objective`)}
                        problemId={problem.id}
                      />
                    </td>
                  )}
                  {visibleColumns.keyResults && (
                    <td className="problem-text">
                      <ListCell
                        value={problem.keyResults}
                        onSave={(value) => handleSaveField(problem.id, 'keyResults', value)}
                        title="Key Results"
                        className="problem-text"
                        problemId={problem.id}
                      />
                    </td>
                  )}
                  {visibleColumns.actions && (
                    <td className="problem-text">
                      <ListCell
                        value={problem.actions}
                        onSave={(value) => handleSaveField(problem.id, 'actions', value)}
                        title="Actions"
                        className="problem-text"
                        problemId={problem.id}
                      />
                    </td>
                  )}
                  {visibleColumns.blockers && (
                    <td className="problem-text">
                      <ListCell
                        value={problem.blockers}
                        onSave={(value) => handleSaveField(problem.id, 'blockers', value)}
                        title="Blockers"
                        className="problem-text"
                        problemId={problem.id}
                      />
                    </td>
                  )}
                  {visibleColumns.status && (
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
                  )}
                  {visibleColumns.votes && (
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
                  )}
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
                  data-tutorial="add-problem-bottom"
                  onClick={() => handleCreateProblem(null, 'bottom')}
                  title="Add new problem at bottom"
                >
                  +
                </button>
              </td>
              {visibleColumns.labels && <td className="insert-button-cell"></td>}
              {visibleColumns.objective && <td className="insert-button-cell"></td>}
              {visibleColumns.keyResults && <td className="insert-button-cell"></td>}
              {visibleColumns.actions && <td className="insert-button-cell"></td>}
              {visibleColumns.blockers && <td className="insert-button-cell"></td>}
              {visibleColumns.status && <td className="insert-button-cell"></td>}
              {visibleColumns.votes && <td className="insert-button-cell"></td>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

