/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 */

import { useEffect, useState } from 'react';
import { Problem } from '../../../shared/types';
import { fetchProblems, updateProblem } from '../services/api';
import { EditableCell } from './EditableCell';

interface ProblemsListProps {
  projectId: string;
}

export function ProblemsList({ projectId }: ProblemsListProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      throw error;
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
      case 'Not Started':
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
            {sortedProblems.map((problem) => {
              const depth = getDepth(problem.idPath);
              return (
                <tr key={problem.id} className={`problem-row depth-${depth}`}>
                  <td className="problem-id">
                    <span className="id-path" style={{ paddingLeft: `${depth * 16}px` }}>
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
                    <span className={`status-badge ${getStatusClass(problem.status)}`}>
                      {problem.status}
                    </span>
                  </td>
                  <td className="problem-votes">{problem.votes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

