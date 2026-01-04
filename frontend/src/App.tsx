import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Workspace } from '../../../shared/types';
import { fetchWorkspaces } from './services/api';
import { ProblemsList } from './components/ProblemsList';
import { ThemeToggle } from './components/ThemeToggle';
import { LabelEditorPrototype } from './pages/LabelEditorPrototype';

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadWorkspaces() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWorkspaces();
        setWorkspaces(data);
        // Auto-select first workspace (should be "Default" if seeded)
        if (data.length > 0) {
          setSelectedWorkspaceId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaces();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (workspaces.length === 0) {
    return <div>No workspaces found. Please seed the database.</div>;
  }

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">{selectedWorkspace?.name || 'POKRABS'}</h1>
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
              path="/label-editor-prototype" 
              element={<LabelEditorPrototype />} 
            />
            <Route 
              path="/" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <div>No workspace selected</div>
                )
              } 
            />
            <Route 
              path="/:problemId" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                  />
                ) : (
                  <div>No workspace selected</div>
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
