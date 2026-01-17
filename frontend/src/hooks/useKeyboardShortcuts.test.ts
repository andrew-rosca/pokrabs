import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, ShortcutConfig } from './useKeyboardShortcuts';
import { KeyboardShortcutsProvider } from '../contexts/KeyboardShortcutsContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useKeyboardShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset active element
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    });

    const createEvent = (key: string, options: any = {}) => {
        return new KeyboardEvent('keydown', { key, ...options, bubbles: true });
    };

    it('triggers a simple shortcut', () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 'a', handler, description: 'test a' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });


        window.dispatchEvent(createEvent('a'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('triggers a combo shortcut', () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 's', ctrl: true, handler, description: 'test ctrl+s' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });

        window.dispatchEvent(createEvent('s', { ctrlKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);

        window.dispatchEvent(createEvent('s', { ctrlKey: false }));
        expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('triggers a VIM sequence', async () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 'gg', handler, description: 'test gg' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });


        window.dispatchEvent(createEvent('g'));
        expect(handler).not.toHaveBeenCalled();

        window.dispatchEvent(createEvent('g'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('triggers yy shortcut', async () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 'yy', handler, description: 'copy url' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });

        window.dispatchEvent(createEvent('y'));
        expect(handler).not.toHaveBeenCalled();

        window.dispatchEvent(createEvent('y'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ignores shortcuts in input fields', () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 'j', handler, description: 'test j' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });


        // Create an input and focus it
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        input.dispatchEvent(createEvent('j'));
        expect(handler).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });

    it('allows global shortcuts in input fields', () => {
        const handler = vi.fn();
        const shortcuts: ShortcutConfig[] = [
            { key: 's', ctrl: true, handler, description: 'test ctrl+s' }
        ];

        renderHook(() => useKeyboardShortcuts(shortcuts), {
            wrapper: KeyboardShortcutsProvider
        });


        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        input.dispatchEvent(createEvent('s', { ctrlKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);

        document.body.removeChild(input);
    });
});
