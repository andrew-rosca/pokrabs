import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ShortcutInfo {
    key: string;
    description: string;
    category?: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}

interface KeyboardShortcutsContextType {
    registerShortcuts: (id: string, shortcuts: ShortcutInfo[]) => void;
    unregisterShortcuts: (id: string) => void;
    allShortcuts: ShortcutInfo[];
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [registrations, setRegistrations] = useState<Record<string, ShortcutInfo[]>>({});

    const registerShortcuts = useCallback((id: string, shortcuts: ShortcutInfo[]) => {
        setRegistrations(prev => ({ ...prev, [id]: shortcuts }));
    }, []);

    const unregisterShortcuts = useCallback((id: string) => {
        setRegistrations(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    const allShortcuts = useMemo(() => {
        // Flatten all registered shortcuts into a single array
        // and unique them by key/description if they are registered multiple times
        const uniqueShortcuts = new Map<string, ShortcutInfo>();
        Object.values(registrations).flat().forEach(s => {
            const id = `${s.category || 'General'}-${s.key}-${s.description}`;
            uniqueShortcuts.set(id, s);
        });
        return Array.from(uniqueShortcuts.values());
    }, [registrations]);

    return (
        <KeyboardShortcutsContext.Provider value={{ registerShortcuts, unregisterShortcuts, allShortcuts }}>
            {children}
        </KeyboardShortcutsContext.Provider>
    );
};

export const useKeyboardShortcutsContext = () => {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) {
        throw new Error('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider');
    }
    return context;
};
