/**
 * LabelFilter Component
 * 
 * A filter component for selecting labels to filter problems by.
 * Similar to StatusFilter but uses LabelSelector for the selection UI.
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LabelSelector } from './LabelSelector';

interface LabelFilterProps {
  selectedLabels: Set<string>;
  predefinedLabels: string[];
  onFilterChange: (labels: Set<string>) => void;
}

export function LabelFilter({ selectedLabels, predefinedLabels, onFilterChange }: LabelFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Convert Set to array for LabelSelector
  const selectedLabelsArray = Array.from(selectedLabels);
  
  // Check if all predefined labels are selected (or if there are no predefined labels, check if any labels are selected)
  const allSelected = predefinedLabels.length > 0 
    ? predefinedLabels.every(label => selectedLabels.has(label))
    : selectedLabels.size > 0;
  
  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 350; // Similar to LabelEditor overlay width
      const dropdownHeight = 600; // max height (header + actions + content)
      
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
      const target = event.target as Node;
      
      // Don't close if clicking inside the dropdown or button
      if (dropdownRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      
      // Check if the click is on a scrollbar by checking if it's on the document body/html
      // and if the dropdown is still visible
      const element = target as HTMLElement;
      if (element === document.body || element === document.documentElement) {
        // This might be a scrollbar click, but we need to check if the click coordinates
        // are actually outside the dropdown bounds
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          const clickX = event.clientX;
          const clickY = event.clientY;
          
          // If click is within dropdown bounds, don't close (might be scrollbar)
          if (clickX >= rect.left && clickX <= rect.right && 
              clickY >= rect.top && clickY <= rect.bottom) {
            return;
          }
        }
      }
      
      setIsOpen(false);
    }
    
    if (isOpen) {
      // Use a small delay to avoid closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen]);
  
  const handleLabelsChange = (labels: string[]) => {
    onFilterChange(new Set(labels));
  };
  
  const handleSelectAll = () => {
    onFilterChange(new Set(predefinedLabels));
  };
  
  const handleDeselectAll = () => {
    onFilterChange(new Set());
  };
  
  // Count how many labels are selected
  const selectedCount = selectedLabels.size;
  // Only show as active if there are actually labels selected (not 0)
  // When 0, treat it as "no filter" - show all problems
  const hasActiveFilter = selectedCount > 0;
  
  return (
    <div className="label-filter-container">
      <button
        ref={buttonRef}
        className={`label-filter-button ${hasActiveFilter ? 'active' : ''}`}
        data-tutorial="label-filter"
        onClick={() => setIsOpen(!isOpen)}
        title={hasActiveFilter ? `Filtered: ${selectedCount} label${selectedCount !== 1 ? 's' : ''} selected` : 'Filter by labels'}
        aria-label="Filter by labels"
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
          className="label-filter-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '350px',
            maxHeight: '600px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px var(--shadow-lg)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="label-filter-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.9rem',
            borderBottom: '1px solid var(--border-color)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            <span>Filter by Labels</span>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}>
              <button
                className="label-filter-action"
                onClick={handleSelectAll}
                disabled={allSelected || predefinedLabels.length === 0}
                style={{
                  padding: '0.25rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: allSelected || predefinedLabels.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  opacity: allSelected || predefinedLabels.length === 0 ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  minWidth: '70px',
                }}
              >
                Select All
              </button>
              <button
                className="label-filter-action"
                onClick={handleDeselectAll}
                disabled={selectedCount === 0}
                style={{
                  padding: '0.25rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  opacity: selectedCount === 0 ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  minWidth: '60px',
                }}
              >
                Clear
              </button>
            </div>
          </div>
          
          <div 
            className="label-filter-content" 
            style={{
              padding: '0.5rem',
              maxHeight: '500px',
              overflowY: 'auto',
              minHeight: '350px',
            }}
            onMouseDown={(e) => {
              // Prevent clicks inside the scrollable area from closing the dropdown
              e.stopPropagation();
            }}
          >
            <LabelSelector
              selectedLabels={selectedLabelsArray}
              predefinedLabels={predefinedLabels}
              onLabelsChange={handleLabelsChange}
              allowCreate={false} // Don't allow creating new labels in filter
              showRemoveButtons={true}
              containerRef={containerRef}
              autoFocus={true}
              zIndex={1002}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

