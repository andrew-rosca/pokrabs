/**
 * LabelSelector Component
 * 
 * A reusable component for selecting labels with pill display, input field, and suggestions.
 * Used by both LabelEditor and LabelFilter.
 */

import { useState, useRef, useEffect, useMemo } from 'react';

interface LabelSelectorProps {
  selectedLabels: string[];
  predefinedLabels?: string[];
  onLabelsChange: (labels: string[]) => void;
  allowCreate?: boolean; // If false, only allow selecting from predefined labels
  placeholder?: string;
  showRemoveButtons?: boolean; // Show remove buttons on pills
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  containerRef?: React.RefObject<HTMLDivElement>;
  autoFocus?: boolean;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  zIndex?: number; // For suggestions dropdown
}

export function LabelSelector({
  selectedLabels,
  predefinedLabels = [],
  onLabelsChange,
  allowCreate = true,
  placeholder = 'Add label...',
  showRemoveButtons = true,
  className = '',
  inputRef: externalInputRef,
  containerRef: externalContainerRef,
  autoFocus = false,
  onInputFocus,
  onInputBlur,
  zIndex = 1000,
}: LabelSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [filteredPredefined, setFilteredPredefined] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const containerRef = externalContainerRef || internalContainerRef;

  // Get all unique predefined labels that aren't already selected
  const availablePredefined = useMemo(
    () => predefinedLabels.filter(label => !selectedLabels.includes(label)),
    [predefinedLabels, selectedLabels]
  );

  // Filter predefined labels based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availablePredefined.filter(label =>
        label.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredPredefined(filtered);
      setShowSuggestions(filtered.length > 0 || (allowCreate && inputValue.trim().length > 0));
    } else {
      setFilteredPredefined(availablePredefined);
      setShowSuggestions(availablePredefined.length > 0);
    }
  }, [inputValue, availablePredefined, allowCreate]);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [autoFocus, inputRef]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Don't close if clicking inside the container
      if (containerRef.current?.contains(target)) {
        return;
      }
      // Don't close if clicking on scrollbars
      if (target.nodeName === 'HTML' || target.nodeName === 'BODY') {
        return;
      }
      setShowSuggestions(false);
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSuggestions, containerRef]);

  const handleAddLabel = (label: string) => {
    const trimmedLabel = label.trim();
    if (trimmedLabel && !selectedLabels.includes(trimmedLabel)) {
      onLabelsChange([...selectedLabels, trimmedLabel]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    onLabelsChange(selectedLabels.filter(label => label !== labelToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim() && (allowCreate || availablePredefined.includes(inputValue.trim()))) {
        handleAddLabel(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && selectedLabels.length > 0) {
      // Remove last label when backspace is pressed on empty input
      handleRemoveLabel(selectedLabels[selectedLabels.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputFocusInternal = () => {
    setShowSuggestions(true);
    onInputFocus?.();
  };

  const handleInputBlurInternal = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't clear suggestions on blur if the related target is within our container
    // This prevents clearing when clicking on suggestions or scrolling
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      return;
    }
    onInputBlur?.();
  };

  return (
    <div
      ref={containerRef}
      className={`label-selector ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        alignItems: 'center',
        minHeight: '2rem',
      }}
    >
      {/* Selected label pills */}
      {selectedLabels.map(label => (
        <span
          key={label}
          className="label-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.125rem',
            padding: '0.0625rem',
            borderRadius: '4px',
            fontSize: '0.6875rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
          }}
        >
          {label}
          {showRemoveButtons && (
            <button
              type="button"
              onClick={() => handleRemoveLabel(label)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                marginLeft: '0.125rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '12px',
                height: '12px',
              }}
              title="Remove label"
              aria-label={`Remove ${label}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onFocus={handleInputFocusInternal}
        onBlur={handleInputBlurInternal}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          minWidth: '100px',
          flex: 1,
        }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px var(--shadow-lg)',
            zIndex,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {/* Predefined label suggestions */}
          {filteredPredefined.length > 0 && (
            <>
              <div
                style={{
                  padding: '0.5rem',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 600,
                }}
              >
                Existing labels
              </div>
              {filteredPredefined.map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAddLabel(label)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.0625rem',
                      borderRadius: '4px',
                      fontSize: '0.6875rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      lineHeight: '1.2',
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Create new label option */}
          {allowCreate &&
            inputValue.trim() &&
            !selectedLabels.includes(inputValue.trim()) &&
            !predefinedLabels.includes(inputValue.trim()) && (
              <div
                style={{
                  borderTop:
                    filteredPredefined.length > 0
                      ? '1px solid var(--border-color)'
                      : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleAddLabel(inputValue)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ marginRight: '0.5rem' }}>+</span>
                  Create "{inputValue.trim()}"
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

