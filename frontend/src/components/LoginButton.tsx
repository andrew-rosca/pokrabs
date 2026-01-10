/**
 * Login Button Component
 * 
 * Displays login/logout button based on authentication state.
 * Only shown when authentication is required (not in demo mode).
 */

import { useState, useEffect } from 'react';
import { authService, AuthState } from '../services/auth';

export function LoginButton() {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Don't show in demo mode
  if (authState.mode === 'demo') {
    return null;
  }

  const handleLogin = () => {
    authService.login('google');
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  if (authState.user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: '#666' }}>
          {authState.user.name} ({authState.user.email})
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#4285f4',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ fill: 'currentColor' }}>
        <path d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.48h4.84c-.209 1.18-.843 2.18-1.796 2.85v2.26h2.91c1.702-1.567 2.684-3.874 2.684-6.75z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.965-2.18l-2.91-2.26c-.806.54-1.837.86-3.055.86-2.35 0-4.34-1.587-5.053-3.72H.957v2.33C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
        <path d="M3.947 10.72c-.18-.54-.282-1.117-.282-1.72s.102-1.18.282-1.72V4.95H.957C.348 6.173 0 7.55 0 9s.348 2.827.957 4.05l2.99-2.33z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.95L3.947 7.28C4.66 5.143 6.65 3.556 9 3.556z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </button>
  );
}

