/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 */

import { useEffect, useState } from 'react';
import { Problem, Status, CreateProblemRequest } from '../../../shared/types';
import { fetchProblems, updateProblem, createProblem, deleteProblem } from '../services/api';
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
        problem: JSON.stringify({ summary: 'New problem', detail: '' }),
        objective: JSON.stringify({ summary: 'New objective', detail: '' }),
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
                      <span className="row-handle-indicator">⋮</span>
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

