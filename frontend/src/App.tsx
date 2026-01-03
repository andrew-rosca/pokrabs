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
  const [searchQuery, setSearchQuery] = useState<string>('');

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
          <div className="header-right">
            <div className="header-search">
              <input
                type="text"
                className="header-search-input"
                placeholder="search ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="header-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route 
              path="/" 
              element={
                selectedProjectId ? (
                  <ProblemsList 
                    projectId={selectedProjectId}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <div>No project selected</div>
                )
              } 
            />
            <Route 
              path="/:problemId" 
              element={
                selectedProjectId ? (
                  <ProblemsList 
                    projectId={selectedProjectId}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <div>No project selected</div>
                )
              } 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
