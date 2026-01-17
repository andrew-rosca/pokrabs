import React, { useMemo } from 'react';
import { useKeyboardShortcutsContext } from '../contexts/KeyboardShortcutsContext';
import { createPortal } from 'react-dom';

interface KeyboardCheatsheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardCheatsheet: React.FC<KeyboardCheatsheetProps> = ({ isOpen, onClose }) => {
    const { allShortcuts } = useKeyboardShortcutsContext();

    const groupedShortcuts = useMemo(() => {
        const groups: Record<string, typeof allShortcuts> = {};
        allShortcuts.forEach(s => {
            const category = s.category || 'General';
            if (!groups[category]) groups[category] = [];
            groups[category].push(s);
        });
        return groups;
    }, [allShortcuts]);

    if (!isOpen) return null;

    const renderKey = (s: typeof allShortcuts[0]) => {
        const parts = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.shift) parts.push('Shift');
        if (s.alt) parts.push('Alt');
        if (s.meta) parts.push('Meta');
        parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
        return parts.join(' + ');
    };

    return createPortal(
        <>
            <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }} />
            <div className="cheatsheet-modal" style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--bg-primary)',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 2001,
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                        <div key={category}>
                            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                                {category}
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {shortcuts.map((s, i) => (
                                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-primary)' }}>{s.description}</span>
                                        <kbd style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            padding: '0.2rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace',
                                            border: '1px solid var(--border-color)',
                                            boxShadow: '0 1px 0 var(--border-color)',
                                            marginLeft: '1rem',
                                            whiteSpace: 'nowrap'
                                        }}>{renderKey(s)}</kbd>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Press <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>?</kbd> to toggle this help.
                    Press <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Esc</kbd> to close.
                </div>
            </div>
        </>,
        document.body
    );
};
