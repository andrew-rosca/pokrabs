import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Status } from '../../../shared/types';

interface StatusFilterProps {
  selectedStatuses: Set<Status>;
  onFilterChange: (statuses: Set<Status>) => void;
}

export function StatusFilter({ selectedStatuses, onFilterChange }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // All available statuses
  const allStatuses = [Status.NotStarted, Status.InProgress, Status.Blocked, Status.Resolved];
  
  // Check if all statuses are selected
  const allSelected = allStatuses.every(status => selectedStatuses.has(status));
  
  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 200; // min-width from CSS
      const dropdownHeight = 250; // estimated height
      
      // Calculate initial position
      let top = rect.bottom + 4;
      let left = rect.left;
      
      // Adjust horizontal position if it would go off-screen
      const viewportWidth = window.innerWidth;
      if (left + dropdownWidth > viewportWidth) {
        // Align to the right edge of the button instead
        left = rect.right - dropdownWidth;
        // If still off-screen, align to viewport edge
        if (left < 0) {
          left = 10; // 10px margin from edge
        }
      }
      
      // Adjust vertical position if it would go off-screen
      const viewportHeight = window.innerHeight;
      if (top + dropdownHeight > viewportHeight) {
        // Show above the button instead
        top = rect.top - dropdownHeight - 4;
        // If still off-screen, align to viewport edge
        if (top < 0) {
          top = 10; // 10px margin from top
        }
      }
      
      setDropdownPosition({ top, left });
    }
  }, [isOpen]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);
  
  const handleToggleStatus = (status: Status) => {
    const newStatuses = new Set(selectedStatuses);
    if (newStatuses.has(status)) {
      newStatuses.delete(status);
    } else {
      newStatuses.add(status);
    }
    onFilterChange(newStatuses);
  };
  
  const handleSelectAll = () => {
    const newStatuses = new Set(allStatuses);
    onFilterChange(newStatuses);
  };
  
  const handleDeselectAll = () => {
    onFilterChange(new Set());
  };
  
  // Get status color class
  const getStatusClass = (status: Status): string => {
    switch (status) {
      case Status.Blocked:
        return 'status-blocked';
      case Status.InProgress:
        return 'status-in-progress';
      case Status.Resolved:
        return 'status-resolved';
      case Status.NotStarted:
      default:
        return 'status-not-started';
    }
  };
  
  // Count how many statuses are selected
  const selectedCount = selectedStatuses.size;
  const hasActiveFilter = selectedCount < allStatuses.length;
  
  return (
    <div className="status-filter-container">
      <button
        ref={buttonRef}
        className={`status-filter-button ${hasActiveFilter ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={hasActiveFilter ? `Filtered: ${selectedCount} of ${allStatuses.length} statuses shown` : 'Filter by status'}
        aria-label="Filter by status"
      >
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {hasActiveFilter && (
          <span className="filter-count">{selectedCount}</span>
        )}
      </button>
      
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="status-filter-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="status-filter-header">
            <span className="status-filter-title">Filter by Status</span>
          </div>
          
          <div className="status-filter-actions">
            <button
              className="status-filter-action"
              onClick={handleSelectAll}
              disabled={allSelected}
            >
              Select All
            </button>
            <button
              className="status-filter-action"
              onClick={handleDeselectAll}
              disabled={selectedCount === 0}
            >
              Clear
            </button>
          </div>
          
          <div className="status-filter-list">
            {allStatuses.map((status) => {
              const isChecked = selectedStatuses.has(status);
              return (
                <label
                  key={status}
                  className={`status-filter-item ${isChecked ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleStatus(status)}
                    className="status-filter-checkbox"
                  />
                  <span className={`status-filter-indicator ${isChecked ? 'checked' : ''}`}>
                    {isChecked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className={`status-filter-label ${getStatusClass(status)}`}>
                    {status}
                  </span>
                </label>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

