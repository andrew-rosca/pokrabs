import { useEffect, useRef, useId } from 'react';
import { useKeyboardShortcutsContext, ShortcutInfo } from '../contexts/KeyboardShortcutsContext';

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface ShortcutConfig extends ShortcutInfo {
    handler: ShortcutHandler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
    const { registerShortcuts, unregisterShortcuts } = useKeyboardShortcutsContext();
    const id = useId();
    const sequences = useRef<string>('');
    const sequenceTimer = useRef<number | null>(null);

    // Register shortcuts with context for the cheatsheet
    useEffect(() => {
        if (enabled) {
            registerShortcuts(id, shortcuts.map(({ handler, ...rest }) => rest));
        } else {
            unregisterShortcuts(id);
        }
        return () => unregisterShortcuts(id);
    }, [id, shortcuts, enabled, registerShortcuts, unregisterShortcuts]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore shortcuts if in an input field
            const active = document.activeElement;
            const isInput =
                active?.tagName === 'INPUT' ||
                active?.tagName === 'TEXTAREA' ||
                (active as HTMLElement)?.isContentEditable;

            if (isInput) {
                // Only ignore if it's not a global shortcut like Ctrl+S
                if (!e.ctrlKey && !e.metaKey) return;
                // Even with Ctrl, we might want to ignore some in inputs, but Ctrl+S/Ctrl+F are usually fine
            }

            // Check for exact shortcut matches
            const shortcut = shortcuts.find(s => {
                const keyMatch = s.key.toLowerCase() === e.key.toLowerCase();
                const ctrlMatch = !!s.ctrl === e.ctrlKey;
                const shiftMatch = !!s.shift === e.shiftKey;
                const altMatch = !!s.alt === e.altKey;
                const metaMatch = !!s.meta === e.metaKey;
                return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
            });

            if (shortcut) {
                e.preventDefault();
                shortcut.handler(e);
                sequences.current = '';
                return;
            }

            // Handle VIM sequences (only when not in input)
            if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
                sequences.current += e.key;

                // Find if sequence matches (VIM motions usually don't have Ctrl/Alt/Meta)
                const sequenceMatch = shortcuts.find(s =>
                    s.key === sequences.current &&
                    !s.ctrl && !s.alt && !s.meta
                );
                if (sequenceMatch) {
                    e.preventDefault();
                    sequenceMatch.handler(e);
                    sequences.current = '';
                } else {
                    // If no match but might be a prefix, wait for next key
                    const isPrefix = shortcuts.some(s => s.key.startsWith(sequences.current));
                    if (!isPrefix) {
                        sequences.current = '';
                    } else {
                        // Set timer to clear sequence if next key doesn't come
                        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
                        sequenceTimer.current = window.setTimeout(() => {
                            sequences.current = '';
                        }, 1000);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
        };
    }, [shortcuts, enabled]);
}
