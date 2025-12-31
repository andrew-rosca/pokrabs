/**
 * ProblemsList Component
 * 
 * Displays a list of problems in a simple table format.
 */

import { useEffect, useState } from 'react';
import { Problem } from '../../../shared/types';
import { fetchProblems } from '../services/api';

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
      <h2 className="problems-title">Problems ({problems.length})</h2>
      <div className="table-container">
        <table className="problems-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Problem</th>
              <th>Objective</th>
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
                    <span className="id-path" style={{ paddingLeft: `${depth * 24}px` }}>
                      {problem.idPath}
                    </span>
                  </td>
                  <td className="problem-text">{parseField(problem.problem)}</td>
                  <td className="problem-text">{parseField(problem.objective)}</td>
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

