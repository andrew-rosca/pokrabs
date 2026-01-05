import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Workspace, View, ViewFilters } from '../../../shared/types';
import { fetchWorkspaces, fetchViews, createView, updateView, useWorkspace } from './services/api';
import { ProblemsList } from './components/ProblemsList';
import { ThemeToggle } from './components/ThemeToggle';
import { ViewSelector } from './components/ViewSelector';
import { WorkspaceSelector } from './components/WorkspaceSelector';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const params = useParams<{
    workspaceId?: string;
    viewId?: string;
    problemId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL manually as fallback since useParams might not work at this level
  // (AppContent is the parent of Routes, so useParams may not have access to route params)
  const pathMatch = location.pathname.match(/^\/w\/([^/]+)(?:\/v\/([^/]+))?(?:\/p\/([^/]+))?/);
  const urlWorkspaceId = params.workspaceId || pathMatch?.[1];
  const urlViewId = params.viewId || pathMatch?.[2];
  const urlProblemId = params.problemId || pathMatch?.[3];
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // View management
  const [views, setViews] = useState<View[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<ViewFilters | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewsError, setViewsError] = useState<string | null>(null);
  
  // Save As dialog state
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const saveAsInputRef = useRef<HTMLInputElement>(null);
  
  // Track the last viewId we programmatically set to avoid conflicts
  const lastProgrammaticViewId = useRef<string | null>(null);
  // Track previous urlViewId to detect actual URL changes
  const prevUrlViewId = useRef<string | undefined>(urlViewId);

  // Load workspaces on mount
  useEffect(() => {
    async function loadWorkspaces() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchWorkspaces();
        setWorkspaces(data);
        
        // If URL has workspaceId, use it; otherwise auto-select first
        if (urlWorkspaceId && data.find(w => w.id === urlWorkspaceId)) {
          setSelectedWorkspaceId(urlWorkspaceId);
        } else if (data.length > 0) {
          // If URL workspace doesn't exist, navigate to first available
          if (urlWorkspaceId) {
            navigate(`/w/${data[0].id}`, { replace: true });
          } else {
            setSelectedWorkspaceId(data[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaces();
  }, [urlWorkspaceId, navigate]);

  // Load views when workspace changes
  useEffect(() => {
    async function loadViews() {
      if (!selectedWorkspaceId) {
        setViews([]);
        setSelectedViewId(null);
        return;
      }

      try {
        setViewsError(null);
        const viewsData = await fetchViews(selectedWorkspaceId);
        setViews(viewsData);
        
        // If URL has viewId and it exists in this workspace, use it
        if (urlViewId && viewsData.find(v => v.id === urlViewId && v.workspaceId === selectedWorkspaceId)) {
          const view = viewsData.find(v => v.id === urlViewId);
          if (view) {
            setSelectedViewId(view.id);
            setCurrentFilters(view.filters);
            setHasUnsavedChanges(false);
            return;
          }
        }
        
        // Otherwise, select default view if available
        const defaultView = viewsData.find(v => v.isDefault);
        if (defaultView) {
          setSelectedViewId(defaultView.id);
          setCurrentFilters(defaultView.filters);
          setHasUnsavedChanges(false);
          
          // If URL had viewId but it was invalid, update URL to default view
          if (urlViewId && urlViewId !== defaultView.id) {
            lastProgrammaticViewId.current = defaultView.id;
            if (urlProblemId) {
              navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}/p/${urlProblemId}`, { replace: true });
            } else {
              navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}`, { replace: true });
            }
          } else if (!urlViewId) {
            // If no viewId in URL, navigate to include default view
            lastProgrammaticViewId.current = defaultView.id;
            navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}`, { replace: true });
          }
        } else if (viewsData.length > 0) {
          // If no default view, select the first one
          setSelectedViewId(viewsData[0].id);
          setCurrentFilters(viewsData[0].filters);
          setHasUnsavedChanges(false);
          
          // Update URL to include first view
          if (!urlViewId) {
            lastProgrammaticViewId.current = viewsData[0].id;
            navigate(`/w/${selectedWorkspaceId}/v/${viewsData[0].id}`, { replace: true });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load views';
        console.error('Failed to load views:', err);
        setViewsError(errorMessage);
      }
    }

    loadViews();
  }, [selectedWorkspaceId, navigate]);

  // Sync view selection when URL viewId changes (only for browser navigation, not programmatic)
  useEffect(() => {
    // Only run if urlViewId actually changed (browser navigation)
    if (prevUrlViewId.current === urlViewId) return;
    prevUrlViewId.current = urlViewId;
    
    if (!selectedWorkspaceId || !urlViewId || !views.length) return;
    
    // Ignore URL changes that we initiated programmatically
    if (lastProgrammaticViewId.current === urlViewId) {
      lastProgrammaticViewId.current = null;
      return;
    }
    
    // Only sync if the URL viewId is different from the currently selected view
    if (urlViewId === selectedViewId) return;
    
    const view = views.find(v => v.id === urlViewId && v.workspaceId === selectedWorkspaceId);
    if (view) {
      setSelectedViewId(view.id);
      setCurrentFilters(view.filters);
      setHasUnsavedChanges(false);
    } else {
      // Invalid viewId in URL - select default view and update URL
      const defaultView = views.find(v => v.isDefault);
      if (defaultView) {
        setSelectedViewId(defaultView.id);
        setCurrentFilters(defaultView.filters);
        setHasUnsavedChanges(false);
        lastProgrammaticViewId.current = defaultView.id;
        if (urlProblemId) {
          navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}/p/${urlProblemId}`, { replace: true });
        } else {
          navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}`, { replace: true });
        }
      }
    }
    // Note: views and selectedViewId are used inside but not in deps to avoid unnecessary runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlViewId, selectedWorkspaceId, urlProblemId, navigate]);

  const handleViewSelect = useCallback((viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view && selectedWorkspaceId) {
      // Mark that we're navigating programmatically to avoid URL sync effect interference
      lastProgrammaticViewId.current = viewId;
      
      // Update state first
      setSelectedViewId(viewId);
      setCurrentFilters(view.filters);
      setHasUnsavedChanges(false);
      
      // Update URL - preserve problemId if present
      if (urlProblemId) {
        navigate(`/w/${selectedWorkspaceId}/v/${viewId}/p/${urlProblemId}`, { replace: true });
      } else {
        navigate(`/w/${selectedWorkspaceId}/v/${viewId}`, { replace: true });
      }
    }
  }, [views, selectedWorkspaceId, urlProblemId, navigate]);

  const handleFiltersChange = (filters: ViewFilters) => {
    setCurrentFilters(filters);
    // Check if filters differ from current view
    const currentView = views.find(v => v.id === selectedViewId);
    if (currentView) {
      const filtersMatch = 
        JSON.stringify(currentView.filters.selectedStatuses.sort()) === 
          JSON.stringify(filters.selectedStatuses.sort()) &&
        JSON.stringify(currentView.filters.selectedLabels.sort()) === 
          JSON.stringify(filters.selectedLabels.sort());
      setHasUnsavedChanges(!filtersMatch);
    } else {
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    if (!selectedViewId || !currentFilters) return;

    try {
      await updateView(selectedViewId, { filters: currentFilters });
      // Reload views to get updated data
      if (selectedWorkspaceId) {
        const viewsData = await fetchViews(selectedWorkspaceId);
        setViews(viewsData);
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save view:', err);
    }
  };

  const handleSaveAsClick = () => {
    if (!selectedWorkspaceId || !currentFilters) return;
    setSaveAsName('');
    setShowSaveAsDialog(true);
  };

  const handleSaveAsConfirm = async () => {
    if (!selectedWorkspaceId || !currentFilters) return;

    const trimmedName = saveAsName.trim();
    if (!trimmedName) {
      return; // Empty name
    }

    try {
      // Create the new view with the current filters
      const newView = await createView(selectedWorkspaceId, {
        name: trimmedName,
        filters: currentFilters,
        isDefault: false,
      });
      
      // Reload views to get updated list (includes the new view)
      const viewsData = await fetchViews(selectedWorkspaceId);
      setViews(viewsData);
      
      // Select the newly created view using the ID from the response
      setSelectedViewId(newView.id);
      setCurrentFilters(newView.filters);
      setHasUnsavedChanges(false);
      setShowSaveAsDialog(false);
      setSaveAsName('');
      
      // Update URL to include new view
      lastProgrammaticViewId.current = newView.id;
      if (urlProblemId) {
        navigate(`/w/${selectedWorkspaceId}/v/${newView.id}/p/${urlProblemId}`, { replace: true });
      } else {
        navigate(`/w/${selectedWorkspaceId}/v/${newView.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to create view:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create view';
      alert(`Failed to create view: ${errorMessage}`);
    }
  };

  const handleSaveAsCancel = () => {
    setShowSaveAsDialog(false);
    setSaveAsName('');
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (showSaveAsDialog && saveAsInputRef.current) {
      setTimeout(() => {
        saveAsInputRef.current?.focus();
        saveAsInputRef.current?.select();
      }, 0);
    }
  }, [showSaveAsDialog]);

  const handleViewDeleted = async () => {
    if (selectedWorkspaceId) {
      const viewsData = await fetchViews(selectedWorkspaceId);
      setViews(viewsData);
      // Select default view if current was deleted
      const defaultView = viewsData.find(v => v.isDefault);
      if (defaultView) {
        setSelectedViewId(defaultView.id);
        setCurrentFilters(defaultView.filters);
        // Update URL
        lastProgrammaticViewId.current = defaultView.id;
        if (urlProblemId) {
          navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}/p/${urlProblemId}`, { replace: true });
        } else {
          navigate(`/w/${selectedWorkspaceId}/v/${defaultView.id}`, { replace: true });
        }
      }
    }
  };

  const handleViewRenamed = async () => {
    if (selectedWorkspaceId) {
      const viewsData = await fetchViews(selectedWorkspaceId);
      setViews(viewsData);
    }
  };

  const handleWorkspaceSelect = async (workspaceId: string) => {
    // Update lastUsedAt
    try {
      await useWorkspace(workspaceId);
    } catch (error) {
      console.error('Failed to update workspace usage:', error);
    }
    
    setSelectedWorkspaceId(workspaceId);
    // Navigate to workspace URL - views will be loaded and default view selected
    // The useEffect for views will handle navigating to include the view
    navigate(`/w/${workspaceId}`, { replace: true });
  };

  const handleWorkspaceCreated = async () => {
    // Reload workspaces list
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      console.error('Failed to reload workspaces:', err);
    }
  };

  const handleWorkspaceDeleted = async () => {
    // Reload workspaces list
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data);
      // If current workspace was deleted, select first available
      if (data.length > 0 && !data.find(w => w.id === selectedWorkspaceId)) {
        setSelectedWorkspaceId(data[0].id);
        navigate(`/w/${data[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to reload workspaces:', err);
    }
  };

  const handleWorkspaceRenamed = async () => {
    // Reload workspaces list
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      console.error('Failed to reload workspaces:', err);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (workspaces.length === 0) {
    return <div>No workspaces found. Please seed the database.</div>;
  }

  return (
    <div className="app">
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <WorkspaceSelector
              workspaces={workspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              onWorkspaceSelect={handleWorkspaceSelect}
              onWorkspaceCreated={handleWorkspaceCreated}
              onWorkspaceDeleted={handleWorkspaceDeleted}
              onWorkspaceRenamed={handleWorkspaceRenamed}
            />
            {selectedWorkspaceId && (
              <>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>|</span>
                <ViewSelector
                  views={views}
                  selectedViewId={selectedViewId}
                  onViewSelect={handleViewSelect}
                  onViewDeleted={handleViewDeleted}
                  onViewRenamed={handleViewRenamed}
                />
                {viewsError && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-danger, #dc3545)' }}>
                    {viewsError}
                  </span>
                )}
              </>
            )}
            {hasUnsavedChanges && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Save
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSaveAsClick();
                  }}
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Save As...
                </a>
              </div>
            )}
          </div>
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
              path="/w/:workspaceId/v/:viewId/p/:problemId" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                    viewFilters={currentFilters}
                    onFiltersChange={handleFiltersChange}
                  />
                ) : (
                  <div>No workspace selected</div>
                )
              } 
            />
            <Route 
              path="/w/:workspaceId/v/:viewId" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                    viewFilters={currentFilters}
                    onFiltersChange={handleFiltersChange}
                  />
                ) : (
                  <div>No workspace selected</div>
                )
              } 
            />
            <Route 
              path="/w/:workspaceId" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                    viewFilters={currentFilters}
                    onFiltersChange={handleFiltersChange}
                  />
                ) : (
                  <div>No workspace selected</div>
                )
              } 
            />
            <Route 
              path="/" 
              element={
                selectedWorkspaceId ? (
                  <ProblemsList 
                    workspaceId={selectedWorkspaceId}
                    searchQuery={searchQuery}
                    viewFilters={currentFilters}
                    onFiltersChange={handleFiltersChange}
                  />
                ) : (
                  <div>No workspace selected</div>
                )
              } 
            />
          </Routes>
        </main>
        
        {/* Save As Dialog */}
        {showSaveAsDialog && createPortal(
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              }}
              onClick={handleSaveAsCancel}
            />
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                maxWidth: '90vw',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                boxShadow: '0 2px 8px var(--shadow-lg)',
                zIndex: 1001,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleSaveAsCancel();
                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSaveAsConfirm();
                }
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                Save View As
              </div>
              <div>
                <label
                  htmlFor="save-as-name"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Enter a name for the new view:
                </label>
                <input
                  id="save-as-name"
                  ref={saveAsInputRef}
                  type="text"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveAsConfirm();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      handleSaveAsCancel();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  placeholder="View name"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSaveAsCancel}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsConfirm}
                  disabled={!saveAsName.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: saveAsName.trim() ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                    color: saveAsName.trim() ? 'white' : 'var(--text-secondary)',
                    cursor: saveAsName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
  );
}

export default App;
