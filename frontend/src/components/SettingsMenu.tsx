/**
 * Settings Menu Component
 * 
 * Unified settings menu that consolidates theme toggle and authentication options.
 */

import { useState, useEffect, useRef } from 'react';
import { authService, AuthState } from '../services/auth';

export function SettingsMenu() {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or default to light mode
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleThemeToggle = () => {
    setIsDark(!isDark);
    setIsOpen(false); // Close menu after action
  };

  const handleLogin = () => {
    authService.login('google');
    setIsOpen(false); // Close menu after action
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsOpen(false); // Close menu after action
    // Redirect to home page to make it clear user is logged out
    window.location.href = '/';
  };

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        onClick={handleToggleMenu}
        className="settings-menu-button"
        data-tutorial="settings-menu"
        aria-label="Settings"
        aria-expanded={isOpen}
        title="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 154.88 154.92"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="m336.78 565.51c-1.5973 0.10936-3.15 0.35671-4.7194 0.53629h-0.1063l-3.7538 20.486c-6.119 1.3934-11.875 3.7582-17.054 6.9717l-16.85-12.12c-4.5522 3.5341-8.6946 7.6559-12.334 12.12l11.691 17.054c-3.5496 5.4246-6.2191 11.619-7.7225 18.126-0.00018 0.031-0.00018 0.10198 0 0.10702l-20.379 3.2177c-0.3725 3.0431-0.53624 6.1881-0.53624 9.3313 0 2.5718 0.071 5.1092 0.32165 7.6152l20.379 3.6467c1.4493 7.0769 4.2026 13.686 8.0441 19.521l-12.12 16.625c3.4711 4.3092 7.4784 8.2326 11.798 11.691l17.161-11.798c5.9977 3.826 12.693 6.5088 19.95 7.8298l3.2176 20.272c2.2866 0.20798 4.6316 0.2145 6.9719 0.2145 3.3039 0 6.46-0.12522 9.6531-0.53628l3.8614-20.701c6.8901-1.7147 13.363-4.6894 18.984-8.6878l16.517 12.013c4.2835-3.6443 8.2005-7.8332 11.584-12.335l-12.013-17.376c3.2534-5.6185 5.5073-11.818 6.6498-18.448l20.272-3.2177c0.17838-2.1154 0.21297-4.167 0.21297-6.3282 0-3.7556-0.43675-7.4379-0.96556-11.047l-20.593-3.754c-1.6138-5.9591-4.2617-11.519-7.615-16.518l12.12-16.625c-3.7569-4.5944-8.0424-8.8386-12.763-12.442l-17.483 12.013c-5.0248-2.9718-10.432-5.2519-16.303-6.5427l-3.2176-20.379c-2.9286-0.34452-5.8815-0.53628-8.9021-0.53628-0.81656 0-1.6567-0.024-2.4672 0-0.39495 0.0126-0.78593-0.024-1.1796 0-0.1063 0.007-0.21621-0.007-0.32269 0zm2.7888 52.127c0.39207-0.0213 0.78323 0 1.18 0 12.696 0 23.06 10.364 23.06 23.06s-10.364 22.953-23.06 22.953-22.953-10.257-22.953-22.953c0-12.299 9.6261-22.444 21.773-23.06z"
            fill="currentColor"
            transform="translate(-263.31,-563.77)"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="settings-menu-dropdown">
          {authState.user && (
            <div className="settings-menu-user-info">
              <div className="settings-menu-user-name">{authState.user.name}</div>
              <div className="settings-menu-user-email">{authState.user.email}</div>
            </div>
          )}
          <button
            className="settings-menu-item"
            onClick={handleThemeToggle}
          >
            Toggle Theme
          </button>
          {authState.mode !== 'demo' && (
            authState.user ? (
              <button
                className="settings-menu-item"
                onClick={handleLogout}
              >
                Logout
              </button>
            ) : (
              <button
                className="settings-menu-item"
                onClick={handleLogin}
              >
                Sign in
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
