import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Project } from '../../../shared/types';
import { fetchProjects } from './services/api';
import { ProblemsList } from './components/ProblemsList';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProjects();
        setProjects(data);
        // Auto-select first project (should be "Default" if seeded)
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (projects.length === 0) {
    return <div>No projects found. Please seed the database.</div>;
  }

  return (
    <BrowserRouter>
      <div style={{ padding: '20px' }}>
        <h1>POKRABS</h1>
        {selectedProjectId && (
          <ProblemsList projectId={selectedProjectId} />
        )}
      </div>
      <Routes>
        <Route path="/:problemId" element={<div>Problem Detail - Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

