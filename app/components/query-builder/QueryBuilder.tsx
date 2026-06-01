'use client';
import { useEffect, useCallback } from 'react';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { SCHEMAS } from '../../lib/schemas';
import { QueryGroupComponent } from './QueryGroup';
import { QueryPreviewPanel } from './QueryPreview';
import { ResultsPanel } from './ResultsPanel';
import { Toolbar } from './Toolbar';

export function QueryBuilder() {
  const { root, activeSchemaId, undo, redo, resetQuery, addRule, theme, validationErrors } = useQueryStore(
    useShallow(s => ({
      root: s.root,
      activeSchemaId: s.activeSchemaId,
      undo: s.undo, redo: s.redo,
      resetQuery: s.resetQuery,
      addRule: s.addRule,
      theme: s.theme,
      validationErrors: s.validationErrors,
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
          {validationErrors.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Query builder */}
        <div
          className="flex flex-col border-r overflow-hidden"
          style={{ borderColor: 'var(--border-default)', width: '55%', minWidth: 400 }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Zeenote
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              >
                {schema?.name}
              </span>
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
            <QueryGroupComponent
              group={root}
              fields={fields}
              depth={0}
              isRoot={true}
              validationErrors={validationErrors}
            />
          </div>
        </div>

        {/* Right: Preview + Results */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          {/* Preview */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: 200 }}>
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
