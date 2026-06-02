'use client';
import { useMemo, useState, useEffect } from 'react';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { generateQueryPreview } from '../../lib/queryEngine';
import { SCHEMAS } from '../../lib/schemas';

const MODES = [
  { key: 'sql', label: 'SQL' },
  { key: 'mongo', label: 'MongoDB' },
  { key: 'graphql', label: 'GraphQL' },
] as const;

// Runs only on the client — returns highlighted HTML strings per line
function highlightLines(code: string, mode: string): string[] {
  const lines = code.split('\n');
  return lines.map(line => {
    // Prevent HTML injection by escaping user input
    let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    if (mode === 'sql') {
      return escaped
        .replace(/(SELECT|FROM|WHERE|AND|OR|IN|NOT|LIKE|IS|NULL|BETWEEN|REGEXP)/g,
          '<span style="color:var(--color-primary-light);font-weight:600">$1</span>')
        .replace(/('[^']*')/g, '<span style="color:var(--color-success)">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:var(--color-warning)">$1</span>');
    }
    if (mode === 'mongo' || mode === 'graphql') {
      return escaped
        .replace(/(\"[\w$]+\"\s*:)/g, '<span style="color:var(--color-primary-light)">$1</span>')
        .replace(/(\"(?:[^\"\\]|\\.)*\")/g, (m) => {
          if (escaped.indexOf(m) > escaped.indexOf(':') || !escaped.includes(':')) {
            return `<span style="color:var(--color-success)">${m}</span>`;
          }
          return m;
        })
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:var(--color-warning)">$1</span>')
        .replace(/\b(true|false|null)\b/g, '<span style="color:var(--color-tertiary)">$1</span>')
        .replace(/(\$\w+)/g, '<span style="color:var(--color-primary)">$1</span>');
    }
    return escaped;
  });
}

export function QueryPreviewPanel() {
  const { root, activeSchemaId, previewMode, setPreviewMode, previewCollapsed, togglePreviewCollapsed } = useQueryStore(
    useShallow(s => ({
      root: s.root,
      activeSchemaId: s.activeSchemaId,
      previewMode: s.previewMode,
      setPreviewMode: s.setPreviewMode,
      previewCollapsed: s.previewCollapsed,
      togglePreviewCollapsed: s.togglePreviewCollapsed,
    }))
  );

  const [copied, setCopied] = useState(false);
  // Track whether we're on the client — avoids SSR/client HTML mismatch
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const schema = SCHEMAS.find(s => s.id === activeSchemaId);
  const preview = useMemo(
    () => generateQueryPreview(root, schema?.fields ?? []),
    [root, schema?.fields]
  );

  const currentQuery = preview[previewMode];

  // Highlighted lines are only computed client-side
  const highlightedLines = useMemo(
    () => isClient ? highlightLines(currentQuery, previewMode) : null,
    [isClient, currentQuery, previewMode]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="flex flex-col h-full rounded-[var(--radius-lg)] border overflow-hidden transition-all duration-300"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer select-none hover:bg-[var(--bg-hover)] transition-colors"
        style={{ borderColor: 'var(--border-subtle)' }}
        onClick={togglePreviewCollapsed}
      >
        <div className="flex items-center gap-2.5">
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="transition-transform duration-200"
            style={{ transform: previewCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', color: 'var(--text-tertiary)' }}
          >
            <path d="M1 3L5 7L9 3" />
          </svg>
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: 'var(--color-primary)' }} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Query Preview</span>
          <span className="text-xs text-[var(--text-tertiary)]">live</span>
        </div>

        {!previewCollapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-elevated)',
              color: copied ? 'var(--color-success)' : 'var(--text-secondary)',
              border: `1px solid ${copied ? 'var(--color-success)' : 'var(--border-default)'}`,
            }}
          >
            {copied ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1.5 5L4 7.5L8.5 2.5" strokeLinecap="round"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="1" width="6" height="7" rx="1"/>
                  <path d="M7 1H2a1 1 0 00-1 1v7"/>
                </svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* Mode tabs */}
      {!previewCollapsed && (
        <div className="flex gap-0 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {MODES.map(mode => (
            <button
              key={mode.key}
              onClick={() => setPreviewMode(mode.key)}
              className="px-4 py-2.5 text-xs font-semibold transition-all relative"
              style={{
                color: previewMode === mode.key ? 'var(--color-primary-light)' : 'var(--text-tertiary)',
                borderBottom: previewMode === mode.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: previewMode === mode.key ? 'rgba(243, 91, 37, 0.06)' : 'transparent',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}

      {/* Code */}
      {!previewCollapsed && (
        <div className="flex-1 overflow-auto p-4">
          <pre
            className="query-preview text-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)' }}
            suppressHydrationWarning
          >
            {highlightedLines
              ? highlightedLines.map((html, i) => (
                  <div
                    key={i}
                    className="leading-relaxed"
                    suppressHydrationWarning
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ))
              : currentQuery.split('\n').map((line, i) => (
                  <div key={i} className="leading-relaxed">{line}</div>
                ))
            }
          </pre>
        </div>
      )}
    </div>
  );
}
