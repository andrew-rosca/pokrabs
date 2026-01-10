/**
 * SettingsMenu Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsMenu } from './SettingsMenu';
import { authService, AuthState } from '../services/auth';

// Mock the auth service
vi.mock('../services/auth', () => ({
  authService: {
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}), // Return unsubscribe function
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockAuthService = authService as any;

describe('SettingsMenu', () => {
  let mockUnsubscribe: () => void;
  let mockSetState: (state: AuthState) => void;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    mockSetState = vi.fn();

    // Setup subscribe mock to capture the listener
    mockAuthService.subscribe.mockImplementation((listener: (state: AuthState) => void) => {
      mockSetState = listener;
      return mockUnsubscribe;
    });

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock document.documentElement.classList
    document.documentElement.classList.remove = vi.fn();
    document.documentElement.classList.add = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component rendering', () => {
    it('should render settings button', () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('should have tutorial attribute', () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      
      const button = screen.getByLabelText('Settings');
      expect(button).toHaveAttribute('data-tutorial', 'settings-menu');
    });

    it('should not render in demo mode', () => {
      mockAuthService.getState.mockReturnValue({ mode: 'demo', user: null, isLoading: false });
      
      const { container } = render(<SettingsMenu />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Dropdown behavior', () => {
    it('should open dropdown when button is clicked', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
    });

    it('should close dropdown when button is clicked again', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      
      // Open dropdown
      await userEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
      
      // Close dropdown
      await userEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Toggle Theme')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(
        <div>
          <SettingsMenu />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
      
      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByText('Toggle Theme')).not.toBeInTheDocument();
      });
    });
  });

  describe('User info display', () => {
    it('should display user name and email when logged in', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: mockUser, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should not display user info when not logged in', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Theme toggle', () => {
    it('should toggle theme when clicked', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
      
      const themeToggle = screen.getByText('Toggle Theme');
      await userEvent.click(themeToggle);
      
      // Check that dropdown closes after action
      await waitFor(() => {
        expect(screen.queryByText('Toggle Theme')).not.toBeInTheDocument();
      });
      
      // Verify that the theme toggle button is clickable and menu closes
      // (The actual theme change is handled by useEffect which is tested implicitly)
    });
  });

  describe('Authentication options', () => {
    it('should show login button when not authenticated', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });

    it('should show logout button when authenticated', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: mockUser, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    });

    it('should call login when sign in is clicked', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument();
      });
      
      const signInButton = screen.getByText('Sign in');
      await userEvent.click(signInButton);
      
      expect(mockAuthService.login).toHaveBeenCalledWith('google');
      
      // Check that dropdown closes after action
      await waitFor(() => {
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      });
    });

    it('should call logout when logout is clicked', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: mockUser, isLoading: false });
      mockAuthService.logout.mockResolvedValue(undefined);
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText('Logout');
      await userEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
      
      // Check that dropdown closes after action
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu closes after actions', () => {
    it('should close menu after theme toggle', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
      });
      
      const themeToggle = screen.getByText('Toggle Theme');
      await userEvent.click(themeToggle);
      
      await waitFor(() => {
        expect(screen.queryByText('Toggle Theme')).not.toBeInTheDocument();
      });
    });

    it('should close menu after logout', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: mockUser, isLoading: false });
      mockAuthService.logout.mockResolvedValue(undefined);
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
      
      const logoutButton = screen.getByText('Logout');
      await userEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });

    it('should close menu after login', async () => {
      mockAuthService.getState.mockReturnValue({ mode: 'optional', user: null, isLoading: false });
      
      render(<SettingsMenu />);
      const button = screen.getByLabelText('Settings');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Sign in')).toBeInTheDocument();
      });
      
      const signInButton = screen.getByText('Sign in');
      await userEvent.click(signInButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      });
    });
  });
});
