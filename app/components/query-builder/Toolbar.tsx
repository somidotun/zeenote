'use client';
import { useState, useRef } from 'react';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { SCHEMAS } from '../../lib/schemas';

export function Toolbar() {
  const {
    activeSchemaId, setSchema,
    undo, redo, historyIndex, history,
    resetQuery,
    savedQueries, saveQuery, loadSavedQuery, deleteSavedQuery,
    root,
    importQuery,
    theme, toggleTheme,
  } = useQueryStore(
    useShallow(s => ({
      activeSchemaId: s.activeSchemaId,
      setSchema: s.setSchema,
      undo: s.undo, redo: s.redo,
      historyIndex: s.historyIndex,
      history: s.history,
      resetQuery: s.resetQuery,
      savedQueries: s.savedQueries,
      saveQuery: s.saveQuery,
      loadSavedQuery: s.loadSavedQuery,
      deleteSavedQuery: s.deleteSavedQuery,
      root: s.root,
      importQuery: s.importQuery,
      theme: s.theme,
      toggleTheme: s.toggleTheme,
    }))
  );

  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveQuery(saveName.trim());
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleExport = () => {
    const data = JSON.stringify({ root, schemaId: activeSchemaId }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importQuery(ev.target?.result as string);
        setImportError('');
      } catch {
        setImportError('Invalid JSON file');
        setTimeout(() => setImportError(''), 3000);
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const btnClass = `
    flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium
    border transition-all duration-150
  `;
  const btnDefault = `${btnClass} bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]`;
  const btnPrimary = `${btnClass} bg-[var(--color-primary)] border-[var(--color-primary-dark)] text-white hover:bg-[var(--color-primary-dark)]`;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      {/* Schema selector */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-xs text-[var(--text-tertiary)] font-medium">Schema</span>
        <select
          value={activeSchemaId}
          onChange={e => setSchema(e.target.value)}
          className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm px-2.5 py-1 text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--color-primary)]"
        >
          {SCHEMAS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />

      {/* Undo / Redo */}
      <button
        onClick={undo} disabled={historyIndex <= 0}
        className={btnDefault} title="Undo (Ctrl+Z)"
        style={{ opacity: historyIndex <= 0 ? 0.4 : 1 }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 4h7a3 3 0 010 6H5M1 4l3-3M1 4l3 3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Undo
      </button>
      <button
        onClick={redo} disabled={historyIndex >= history.length - 1}
        className={btnDefault} title="Redo (Ctrl+Y)"
        style={{ opacity: historyIndex >= history.length - 1 ? 0.4 : 1 }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M11 4H4a3 3 0 000 6h3M11 4l-3-3M11 4L8 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Redo
      </button>

      {/* History */}
      <div className="relative">
        <button onClick={() => { setShowHistory(v => !v); setShowSaved(false); }} className={btnDefault}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="5"/>
            <path d="M6 3v3l2 2" strokeLinecap="round"/>
          </svg>
          History
          <span className="ml-0.5 px-1 py-0 rounded text-[10px]"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-tertiary)' }}>
            {history.length}
          </span>
        </button>
        {showHistory && (
          <div
            className="absolute top-full mt-1 left-0 z-50 w-56 rounded-[var(--radius-md)] border shadow-lg overflow-hidden"
            style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border-default)' }}
          >
            <div className="px-3 py-2 text-xs font-semibold border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
              Query History
            </div>
            <div className="max-h-48 overflow-y-auto">
              {[...history].reverse().map((entry, i) => {
                const idx = history.length - 1 - i;
                return (
                  <div
                    key={i}
                    className="px-3 py-2 text-xs cursor-pointer hover:bg-[var(--bg-hover)] flex items-center justify-between"
                    style={{
                      color: idx === historyIndex ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                      background: idx === historyIndex ? 'rgba(243, 91, 37, 0.08)' : 'transparent',
                    }}
                    onClick={() => { /* navigate history */ setShowHistory(false); }}
                  >
                    <span>{entry.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />

      {/* Save / Load */}
      <div className="relative">
        <button onClick={() => { setShowSaved(v => !v); setShowHistory(false); }} className={btnDefault}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V3.5L9 1zM7 1v3H4V1M4 7h4M4 9h2"/>
          </svg>
          Saved
          {savedQueries.length > 0 && (
            <span className="ml-0.5 px-1 py-0 rounded text-[10px]"
              style={{ background: 'var(--color-primary)', color: 'white' }}>
              {savedQueries.length}
            </span>
          )}
        </button>

        {showSaved && (
          <div
            className="absolute top-full mt-1 left-0 z-50 w-64 rounded-[var(--radius-md)] border shadow-lg overflow-hidden"
            style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border-default)' }}
          >
            {/* Save input */}
            <div className="p-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {showSaveInput ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
                    placeholder="Query name..."
                    className="flex-1 text-xs px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button onClick={handleSave} className="px-2 py-1 text-xs rounded bg-[var(--color-primary)] text-white">Save</button>
                  <button onClick={() => setShowSaveInput(false)} className="px-2 py-1 text-xs rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full text-xs py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--color-primary)] transition-all"
                >
                  + Save current query
                </button>
              )}
            </div>

            {savedQueries.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-[var(--text-tertiary)]">No saved queries</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {savedQueries.map(q => (
                  <div key={q.id} className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-hover)] group">
                    <button
                      onClick={() => { loadSavedQuery(q.id); setShowSaved(false); }}
                      className="flex-1 text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {q.name}
                      <span className="text-[10px] text-[var(--text-tertiary)] ml-2">{q.schemaId}</span>
                    </button>
                    <button
                      onClick={() => deleteSavedQuery(q.id)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 transition-all ml-2"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />

      {/* Export */}
      <button onClick={handleExport} className={btnDefault} title="Export query as JSON">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 1v7M3 5l3 3 3-3M1 10h10" strokeLinecap="round"/>
        </svg>
        Export
      </button>

      {/* Import */}
      <button onClick={() => fileRef.current?.click()} className={btnDefault} title="Import query from JSON">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 8V1M3 4l3-3 3 3M1 10h10" strokeLinecap="round"/>
        </svg>
        Import
      </button>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {importError && (
        <span className="text-xs text-[var(--color-danger)]">{importError}</span>
      )}

      <div className="flex-1" />

      {/* Reset */}
      <button onClick={resetQuery} className={btnDefault} title="Reset query (Ctrl+Shift+R)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 6a4 4 0 108-.1M10 3V1M10 3H8" strokeLinecap="round"/>
        </svg>
        Reset
      </button>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className={btnDefault} title="Toggle theme">
        {theme === 'dark' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="2.5"/>
            <path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M2.5 9.5l.7-.7M8.8 3.2l.7-.7" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 6.5A4.5 4.5 0 015.5 2C3 2 1 4 1 6.5a5 5 0 005 5c2.5 0 4.5-2 4.5-4.5-.1-.2-.2-.5-.5-.5z"/>
          </svg>
        )}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </div>
  );
}
