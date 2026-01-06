/**
 * Tutorial Service
 * 
 * Defines tutorial steps and manages localStorage state for tutorial completion.
 */

export interface TutorialStep {
  target: string; // CSS selector or data attribute
  content: {
    title: string;
    body: string;
  };
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
  disableBeacon?: boolean;
  disableOverlayClose?: boolean;
  // Custom metadata for click simulation
  openDropdown?: string; // Selector for dropdown trigger to open
  closeDropdown?: string; // Selector for dropdown trigger to close
}

const TUTORIAL_STORAGE_KEY = 'pokrabs-tutorial-completed';

/**
 * Check if tutorial has been shown before
 */
export function hasTutorialBeenShown(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
}

/**
 * Mark tutorial as shown
 */
export function markTutorialAsShown(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
}

/**
 * Reset tutorial state (for re-running tutorial)
 */
export function resetTutorial(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}

/**
 * Get tutorial steps configuration
 */
export function getTutorialSteps(): TutorialStep[] {
  return [
    {
        target: '[data-tutorial="problems-table-header"]',
        content: {
          title: 'Problems List',
          body: 'This is your main workspace where all problems are displayed. You can edit, filter, and organize problems here.',
        },
        placement: 'top',
    },
    {
        target: '[data-tutorial="status-filter"]',
        content: {
          title: 'Status Filter',
          body: 'Filter problems by their status.',
        },
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="label-filter"]',
        content: {
          title: 'Label Filter',
          body: 'Filter problems by labels to focus on specific categories or tags. Labels help you organize and find related problems.',
        },
        placement: 'bottom',
      },    
      {
        target: '[data-tutorial="add-problem-header"]',
        content: {
          title: 'Add New Problem',
          body: 'You can also add problems at the bottom or as children of existing problems.',
        },
        placement: 'bottom',
      },       
      {
        target: '[data-tutorial="row-actions-panel"]',
        content: {
          title: 'Row Actions Menu',
          body: 'Hover over a problem row to see action buttons: add child problem, move to top/bottom, move to specific position, and delete. You can also drag and drop problems to reorder them.',
        },
        placement: 'left',
      },      
      {
        target: '[data-tutorial="edit-summary-detail-cell"]',
        content: {
          title: 'Edit Problem Content',
          body: 'Click any cell in the Problem or Objective columns to edit. These cells support both summary and detail text.',
        },
        placement: 'right',
      },
      {
        target: '[data-tutorial="expand-summary-detail"]',
        content: {
          title: 'Expand/Collapse Detail',
          body: 'Use the expand button (⌄) in Problem and Objective columns to show or hide detailed content. This helps you see more information without making the table too tall.',
        },
        placement: 'left',
      },
      {
        target: '[data-tutorial="edit-list-cell"]',
        content: {
          title: 'Edit Lists',
          body: 'Click cells in Key Results, Actions, or Blockers columns to edit lists. These columns support multiple items. Use the expand button to see all items when the list is long.',
        },
        placement: 'right',
      },
      {
        target: '[data-tutorial="expand-list-cell"]',
        content: {
          title: 'Expand List Content',
          body: 'When list columns (Key Results, Actions, Blockers) have many items, use the expand button to see all items. When collapsed, only the first few items are visible.',
        },
        placement: 'left',
      },
      {
        target: '[data-tutorial="toggle-id-collapse"]',
        content: {
          title: 'Collapse Problem Hierarchy',
          body: 'Click the collapse button (⌄) next to a problem ID to hide its child problems. Use the double caret (⌄⌄) to collapse the entire subtree. This helps you focus on specific parts of your problem hierarchy.',
        },
        placement: 'right',
      },
      {
        target: '[data-tutorial="copy-problem-url"]',
        content: {
          title: 'Copy Problem Link',
          body: 'Click on a problem ID to copy a shareable link to your clipboard. You can share this link with others or bookmark it for quick access to a specific problem.',
        },
        placement: 'right',
      },
      {
        target: '[data-tutorial="column-visibility-toggles"]',
        content: {
          title: 'Show/Hide Columns',
          body: 'Use the column toggle buttons in the header to show or hide columns.',
        },
        placement: 'bottom',
      },      
    {
        target: '[data-tutorial="search"]',
        content: {
          title: 'Search',
          body: 'Use the search box to quickly find problems by their content.',
        },
        placement: 'bottom',
    },  
    {
        target: '[data-tutorial="view-selector"]',
        content: {
          title: 'View Selector',
          body: 'Views let you save different filter combinations. Switch between views to quickly see different subsets of your problems. After applying filters, you can save the view for future use.',
        },
        placement: 'bottom',
    },    
    {
      target: '[data-tutorial="workspace-selector"]',
      content: {
        title: 'Workspace Selector',
        body: 'Select or create a workspace to organize your problems. Workspaces help you separate different problem contexts.',
      },
      placement: 'bottom',
    },
  ];
}

