import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Project } from '../../../shared/types';
import { fetchProjects } from './services/api';
import { ProblemsList } from './components/ProblemsList';
import { ThemeToggle } from './components/ThemeToggle';

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

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">{selectedProject?.name || 'POKRABS'}</h1>
          <ThemeToggle />
        </header>
        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={
                selectedProjectId ? (
                  <ProblemsList projectId={selectedProjectId} />
                ) : (
                  <div>No project selected</div>
                )
              } 
            />
            <Route path="/:problemId" element={<div>Problem Detail - Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
