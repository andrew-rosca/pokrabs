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
    return <div>Loading problems...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (problems.length === 0) {
    return <div>No problems found.</div>;
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

  return (
    <div>
      <h2>Problems ({problems.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Problem</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Objective</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Votes</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((problem) => (
            <tr key={problem.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{problem.idPath}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseField(problem.problem)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseField(problem.objective)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{problem.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{problem.votes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

