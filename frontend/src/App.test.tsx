/**
 * Sample test to verify test framework setup
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    // Verify the app renders the coming soon message
    expect(screen.getByText(/POKRABS - Coming Soon/i)).toBeInTheDocument();
  });
});

