'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { SCHEMAS } from '../../lib/schemas';
import { QueryGroupComponent } from './QueryGroup';
import { QueryPreviewPanel } from './QueryPreview';
import { ResultsPanel } from './ResultsPanel';
import { Toolbar } from './Toolbar';

export function QueryBuilder() {
  const { root, activeSchemaId, undo, redo, resetQuery, addRule, theme, validationErrors, previewCollapsed } = useQueryStore(
    useShallow(s => ({
      root: s.root,
      activeSchemaId: s.activeSchemaId,
      undo: s.undo, redo: s.redo,
      resetQuery: s.resetQuery,
      addRule: s.addRule,
      theme: s.theme,
      validationErrors: s.validationErrors,
      previewCollapsed: s.previewCollapsed,
    }))
  );

  const schema = SCHEMAS.find(s => s.id === activeSchemaId);
  const fields = schema?.fields ?? [];

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey)) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      if (e.key === 'r' && e.shiftKey) { e.preventDefault(); resetQuery(); }
    }
  }, [undo, redo, resetQuery]);

  const [showSchema, setShowSchema] = useState(false);
  const schemaPopoverRef = useRef<HTMLDivElement>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  // Close schema popover when clicking outside
  useEffect(() => {
    if (!showSchema) return;
    function handleClickOutside(e: MouseEvent) {
      if (schemaPopoverRef.current && !schemaPopoverRef.current.contains(e.target as Node)) {
        setShowSchema(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchema]);

  // Close schema popover when schema changes
  useEffect(() => {
    setShowSchema(false);
  }, [activeSchemaId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ background: 'var(--color-primary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
              <rect x="1" y="1" width="5" height="3" rx="1"/>
              <rect x="8" y="1" width="5" height="3" rx="1"/>
              <rect x="1" y="6" width="5" height="3" rx="1"/>
              <rect x="8" y="6" width="5" height="3" rx="1"/>
              <rect x="4" y="11" width="6" height="2" rx="1"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Zeenote
            </h1>
            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Zeenote</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Builder Toggle */}
          <button
            onClick={() => setShowBuilder(v => !v)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border transition-all duration-200"
            style={{
              background: showBuilder ? 'var(--color-primary)' : 'var(--bg-elevated)',
              borderColor: showBuilder ? 'var(--color-primary-dark)' : 'var(--border-default)',
              color: showBuilder ? 'var(--text-inverse)' : 'var(--text-primary)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {showBuilder ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
            {showBuilder ? 'Close Builder' : 'Query Builder'}
          </button>

          {validationErrors.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>⌘Z</kbd>
            <span>Undo</span>
            <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}>⌘Y</kbd>
            <span>Redo</span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Query builder — always visible on lg+, toggleable on mobile */}
        <div
          className="builder-panel w-full lg:w-[480px] flex flex-col lg:border-r overflow-hidden flex-shrink-0"
          style={{
            borderColor: 'var(--border-default)',
            // On mobile: slide in from top when open, collapse when closed
            // On lg+: always shown at natural size
            maxHeight: showBuilder ? '60vh' : '0',
            transition: 'max-height 300ms cubic-bezier(0.4,0,0.2,1)',
            visibility: showBuilder ? 'visible' : 'hidden',
          }}
        >
          {/* Sub-header: schema badge + add condition */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Zeenote
              </span>

              {/* Schema badge — click to view fields */}
              <div className="relative" ref={schemaPopoverRef}>
                <button
                  id="schema-badge-btn"
                  onClick={() => setShowSchema(v => !v)}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all hover:ring-1"
                  style={{
                    background: showSchema ? 'var(--color-primary)' : 'var(--bg-overlay)',
                    color: showSchema ? 'var(--text-inverse)' : 'var(--color-primary-light)',
                    fontFamily: 'var(--font-mono)',
                    outline: showSchema ? '1.5px solid var(--color-primary)' : 'none',
                    outlineOffset: '1px',
                  }}
                  title="View schema fields"
                  aria-expanded={showSchema}
                  aria-haspopup="true"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                    <rect x="0" y="0" width="3" height="3" rx="0.5" />
                    <rect x="5" y="0" width="3" height="3" rx="0.5" />
                    <rect x="0" y="5" width="3" height="3" rx="0.5" />
                    <rect x="5" y="5" width="3" height="3" rx="0.5" />
                  </svg>
                  {schema?.name}
                  <svg
                    width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    style={{ transform: showSchema ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
                  >
                    <path d="M1 3L5 7L9 3" />
                  </svg>
                </button>

                {/* Schema popover */}
                {showSchema && (
                  <div
                    className="absolute top-full left-0 mt-1.5 z-50 w-72 rounded-[var(--radius-lg)] border shadow-lg overflow-hidden animate-fade-in"
                    style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border-default)' }}
                  >
                    {/* Popover header */}
                    <div
                      className="flex items-center justify-between px-3 py-2 border-b"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {schema?.name} Schema
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,87,34,0.12)', color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' }}
                        >
                          {fields.length} fields
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSchema(false)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Close schema view"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Field list */}
                    <div className="max-h-72 overflow-y-auto py-1">
                      {fields.map((f, i) => (
                        <div
                          key={f.key}
                          className="flex items-start gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors"
                          style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                        >
                          <code
                            className="text-[11px] font-semibold flex-shrink-0 mt-px"
                            style={{ color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)', minWidth: 80 }}
                          >
                            {f.key}
                          </code>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                              <span
                                className="text-[9px] px-1 py-px rounded uppercase tracking-wide font-bold"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  background: {
                                    string:  'rgba(0,184,212,0.12)',
                                    number:  'rgba(249,115,22,0.12)',
                                    boolean: 'rgba(16,185,129,0.12)',
                                    date:    'rgba(99,102,241,0.12)',
                                    enum:    'rgba(255,87,34,0.12)',
                                    array:   'rgba(168,85,247,0.12)',
                                  }[f.type] ?? 'var(--bg-overlay)',
                                  color: {
                                    string:  'var(--color-tertiary)',
                                    number:  'var(--color-warning)',
                                    boolean: 'var(--color-success)',
                                    date:    '#818cf8',
                                    enum:    'var(--color-primary-light)',
                                    array:   '#c084fc',
                                  }[f.type] ?? 'var(--text-tertiary)',
                                }}
                              >
                                {f.type}
                              </span>
                            </div>
                            {f.type === 'enum' && f.enumValues && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {f.enumValues.map(v => (
                                  <span
                                    key={v}
                                    className="text-[9px] px-1 py-px rounded"
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => addRule(root.id)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-all"
              style={{
                background: 'rgba(243, 91, 37, 0.1)',
                color: 'var(--color-primary-light)',
                border: '1px solid rgba(243, 91, 37, 0.3)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 1v8M1 5h8"/>
              </svg>
              Add Condition
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg-base)' }}>
            {!root || !root.children ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-tertiary)] italic">
                No active query loaded or query is invalid.
              </div>
            ) : (
              <QueryGroupComponent
                group={root}
                fields={fields}
                depth={0}
                isRoot={true}
                validationErrors={validationErrors}
              />
            )}
          </div>
        </div>

        {/* lg+: always-visible wrapper overrides the max-height collapse */}
        <style>{`
          @media (min-width: 1024px) {
            .builder-panel {
              max-height: none !important;
              visibility: visible !important;
              border-right: 1px solid var(--border-default);
            }
          }
        `}</style>

        {/* Right: Preview + Results */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0, minHeight: 0 }}>
          {/* Preview */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{
              flex: previewCollapsed ? '0 0 auto' : '1 1 0%',
              minHeight: previewCollapsed ? 'auto' : '200px',
            }}
          >
            <QueryPreviewPanel />
          </div>

          {/* Divider */}
          <div className="h-px flex-shrink-0" style={{ background: 'var(--border-default)' }} />

          {/* Results */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: 200 }}>
            <ResultsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
