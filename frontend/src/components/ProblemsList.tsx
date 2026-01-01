/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 */

import { useEffect, useState } from 'react';
import React from 'react';
import { Problem, Status, CreateProblemRequest } from '../../../shared/types';
import { fetchProblems, updateProblem, createProblem, deleteProblem } from '../services/api';
import { EditableCell } from './EditableCell';

interface ProblemsListProps {
  projectId: string;
}

export function ProblemsList({ projectId }: ProblemsListProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  // Parse JSON fields for display
  const parseField = (field: string) => {
    try {
      const parsed = JSON.parse(field);
      if (typeof parsed === 'object' && parsed.summary) {
        return parsed.summary;
      }
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.join(', ') : '-';
      }
      return field;
    } catch {
      return field;
    }
  };

  // Parse JSON fields for editing (get full content)
  const parseFieldForEdit = (field: string) => {
    try {
      const parsed = JSON.parse(field);
      if (typeof parsed === 'object' && parsed.summary) {
        // For editing, show the summary (we'll update the JSON structure)
        return parsed.summary;
      }
      if (Array.isArray(parsed)) {
        return parsed.join('\n');
      }
      return field;
    } catch {
      return field;
    }
  };

  // Format value back to JSON for saving
  const formatFieldForSave = (problem: Problem, fieldName: string, value: string): string => {
    // For problem and objective, they're stored as JSON with summary/detail
    if (fieldName === 'problem' || fieldName === 'objective') {
      try {
        const currentValue = fieldName === 'problem' ? problem.problem : problem.objective;
        const existing = JSON.parse(currentValue);
        if (typeof existing === 'object' && existing.summary !== undefined) {
          // Update summary, keep detail
          return JSON.stringify({ ...existing, summary: value });
        }
      } catch {
        // If parsing fails, create new structure
      }
      return JSON.stringify({ summary: value, detail: value });
    }
    
    // For arrays (keyResults, actions, blockers), split by newlines
    if (fieldName === 'keyResults' || fieldName === 'actions' || fieldName === 'blockers') {
      const items = value.split('\n').filter(item => item.trim().length > 0);
      return JSON.stringify(items);
    }
    
    return value;
  };

  // Handle saving a field
  const handleSaveField = async (problemId: string, fieldName: string, value: string) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;
    
    const formattedValue = formatFieldForSave(problem, fieldName, value);
    
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

  // Handle deleting a problem (inline confirm)
  const handleDeleteProblem = (problemId: string) => {
    setPendingDeleteId(problemId);
  };

  const handleCancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleConfirmDelete = async (problemId: string) => {
    const previousProblems = problems;
    try {
      setError(null);
      setPendingDeleteId(problemId);

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
    } finally {
      setPendingDeleteId(null);
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

  // Sort problems hierarchically by idPath
  // This ensures parent problems appear before their children
  // and maintains the tree structure visually
  const sortedProblems = [...problems].sort((a, b) => {
    // Sort by idPath which naturally creates hierarchical order
    // e.g., "i0" < "i0-i5" < "i0-i5-na" < "i0-i5-ck"
    return a.idPath.localeCompare(b.idPath);
  });

  // Handle creating a new problem
  const handleCreateProblem = async (insertAfterIndex: number | null) => {
    try {
      setError(null);
      
      // Determine parentId: if inserting after a problem, make it a child of that problem
      // If inserting at the top (insertAfterIndex === null), no parent
      let parentId: string | null = null;
      if (insertAfterIndex !== null && insertAfterIndex >= 0 && insertAfterIndex < sortedProblems.length) {
        parentId = sortedProblems[insertAfterIndex].id;
      }

      // Create new problem with default values
      // Note: Status.NotStarted enum value is 'Actionable', which will serialize correctly
      const newProblem: CreateProblemRequest = {
        problem: JSON.stringify({ summary: 'New problem', detail: 'New problem' }),
        objective: JSON.stringify({ summary: 'New objective', detail: 'New objective' }),
        keyResults: JSON.stringify([]),
        actions: JSON.stringify([]),
        blockers: JSON.stringify([]),
        status: Status.NotStarted,
        labels: [],
        parentId: parentId || null,
      };

      // Debug: log what we're sending
      console.log('Creating problem with:', {
        projectId,
        problem: newProblem.problem.substring(0, 50),
        objective: newProblem.objective.substring(0, 50),
        status: newProblem.status,
        parentId: newProblem.parentId,
      });

      // Create the problem
      await createProblem(projectId, newProblem);
      
      // Reload problems to get the new one with correct idPath and proper sorting
      const data = await fetchProblems(projectId);
      setProblems(data);
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
              <th>ID</th>
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
              return (
                <tr key={problem.id} className={`problem-row depth-${depth}`}>
                  <td className="problem-id">
                    <div className="row-handle-container">
                      <div className="row-handle" title="Row actions">
                        <span className="handle-icon">⋮⋮</span>
                      </div>
                      <div className="row-actions-panel">
                        <button
                          className="row-action-button"
                          onClick={() => handleCreateProblem(index)}
                          title="Insert new problem here (as child of above)"
                        >
                          +
                        </button>
                        <button
                          className="row-action-button row-action-delete"
                          onClick={() => handleDeleteProblem(problem.id)}
                          title="Delete problem"
                        >
                          ×
                        </button>
                        {pendingDeleteId === problem.id && (
                          <div className="row-delete-confirm" role="alert">
                            <span className="row-delete-text">Delete?</span>
                            <button
                              className="row-action-button row-action-delete confirm"
                              onClick={() => handleConfirmDelete(problem.id)}
                              title="Confirm delete"
                            >
                              ✔
                            </button>
                            <button
                              className="row-action-button cancel"
                              onClick={handleCancelDelete}
                              title="Cancel delete"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="id-path" style={{ paddingLeft: `${depth * 8}px` }}>
                      {problem.idPath}
                    </span>
                  </td>
                  <td className="problem-text">
                    <EditableCell
                      value={parseFieldForEdit(problem.problem)}
                      onSave={(value) => handleSaveField(problem.id, 'problem', value)}
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <EditableCell
                      value={parseFieldForEdit(problem.objective)}
                      onSave={(value) => handleSaveField(problem.id, 'objective', value)}
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <EditableCell
                      value={parseFieldForEdit(problem.keyResults)}
                      onSave={(value) => handleSaveField(problem.id, 'keyResults', value)}
                      multiline
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <EditableCell
                      value={parseFieldForEdit(problem.actions)}
                      onSave={(value) => handleSaveField(problem.id, 'actions', value)}
                      multiline
                      className="problem-text"
                    />
                  </td>
                  <td className="problem-text">
                    <EditableCell
                      value={parseFieldForEdit(problem.blockers)}
                      onSave={(value) => handleSaveField(problem.id, 'blockers', value)}
                      multiline
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
            <tr className="insert-button-row">
              <td colSpan={8} className="insert-button-cell">
                <button
                  className="row-action-button"
                  onClick={() => handleCreateProblem(null)}
                  title="Insert new problem at top level"
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

