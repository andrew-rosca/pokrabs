/**
 * Authentication Service
 * 
 * Handles authentication state and OAuth flows.
 */

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  mode: 'demo' | 'optional' | 'required';
  isLoading: boolean;
}

class AuthService {
  private user: User | null = null;
  private mode: 'demo' | 'optional' | 'required' = 'demo';
  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.loadAuthMode();
    this.loadCurrentUser();
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return {
      user: this.user,
      mode: this.mode,
      isLoading: false,
    };
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Load authentication mode from server
   */
  async loadAuthMode(): Promise<void> {
    try {
      const response = await fetch('/api/auth/mode', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        this.mode = data.mode;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load auth mode:', error);
    }
  }

  /**
   * Load current user from server
   */
  async loadCurrentUser(): Promise<void> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  }

  /**
   * Initiate OAuth login flow
   */
  login(provider: string = 'google'): void {
    window.location.href = `/api/auth/${provider}`;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      this.user = null;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  /**
   * Check if authentication is required for write operations
   */
  isWriteAuthRequired(): boolean {
    return this.mode === 'required' || this.mode === 'optional';
  }

  /**
   * Check if authentication is required for read operations
   */
  isReadAuthRequired(): boolean {
    return this.mode === 'required';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }
}

// Export singleton instance
export const authService = new AuthService();

