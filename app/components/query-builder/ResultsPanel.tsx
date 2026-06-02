'use client';
import { useState, useMemo, useCallback } from 'react';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { executeQuery, validateQuery } from '../../lib/queryEngine';
import { generateMockData } from '../../lib/schemas';
import { SCHEMAS } from '../../lib/schemas';
import type { MockDataRecord } from '../../types/query';

const PAGE_SIZE = 10;

export function ResultsPanel() {
  const { root, activeSchemaId, setValidationErrors } = useQueryStore(
    useShallow(s => ({
      root: s.root,
      activeSchemaId: s.activeSchemaId,
      setValidationErrors: s.setValidationErrors,
    }))
  );

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ records: MockDataRecord[]; total: number; filtered: number; executionTime: number } | null>(null);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);

  const schema = SCHEMAS.find(s => s.id === activeSchemaId);
  const mockData = useMemo(() => generateMockData(activeSchemaId, 200), [activeSchemaId]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    // Validate first
    const errors = validateQuery(root);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setError(`${errors.length} validation error${errors.length > 1 ? 's' : ''} found. Fix them before running.`);
      setIsRunning(false);
      return;
    }

    // Simulate async
    await new Promise(r => setTimeout(r, 400));
    const res = executeQuery(root, mockData);
    setResult(res);
    setPage(0);
    setIsRunning(false);
  }, [root, mockData, setValidationErrors]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedRecords = useMemo(() => {
    if (!result?.records) return [];
    if (!sortField) return result.records;
    return [...result.records].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [result?.records, sortField, sortDir]);

  const pageRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil((result?.filtered ?? 0) / PAGE_SIZE);

  const fields = schema?.fields ?? [];

  return (
    <div
      className="flex flex-col h-full rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Results</span>
          {result && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: result.filtered > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: result.filtered > 0 ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {result.filtered} / {result.total}
            </span>
          )}
          {result && (
            <span className="text-xs text-[var(--text-tertiary)]">{result.executionTime}ms</span>
          )}
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all"
          style={{
            background: isRunning ? 'var(--bg-elevated)' : 'var(--color-primary)',
            color: isRunning ? 'var(--text-tertiary)' : 'var(--text-inverse)',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <path d="M1 1L9 6L1 11V1Z"/>
              </svg>
              Run Query
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-[var(--radius-md)] text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!result && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                <path d="M10 2L18 6v8L10 18 2 14V6L10 2z"/>
                <path d="M10 10v4M10 6v1"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Ready to execute</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Build your query and click Run Query</p>
            </div>
          </div>
        )}

        {result && result.filtered === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-[var(--text-secondary)]">No records match your query</p>
          </div>
        )}

        {result && result.filtered > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                {fields.map(f => (
                  <th
                    key={f.key}
                    className="px-3 py-2 text-left font-semibold cursor-pointer select-none whitespace-nowrap"
                    style={{ color: sortField === f.key ? 'var(--color-primary-light)' : 'var(--text-secondary)' }}
                    onClick={() => handleSort(f.key)}
                  >
                    <span className="flex items-center gap-1">
                      {f.label}
                      {sortField === f.key && (
                        <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, i) => (
                <tr
                  key={i}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
                >
                  {fields.map(f => {
                    const val = record[f.key];
                    return (
                      <td key={f.key} className="px-3 py-1.5 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis"
                        style={{ color: 'var(--text-primary)' }}>
                        {f.type === 'boolean' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              background: val ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: val ? 'var(--color-success)' : 'var(--color-danger)',
                            }}>
                            {String(val)}
                          </span>
                        ) : f.type === 'enum' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{ background: 'var(--bg-overlay)', color: 'var(--color-primary-light)' }}>
                            {String(val ?? '')}
                          </span>
                        ) : (
                          <span style={{ color: f.type === 'number' ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                            {Array.isArray(val) ? val.join(', ') : String(val ?? '')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {result && totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-xs flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
          <span className="text-[var(--text-tertiary)]">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.filtered)} of {result.filtered}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-6 h-6 rounded text-[10px] transition-colors"
                  style={{
                    background: page === p ? 'var(--color-primary)' : 'transparent',
                    color: page === p ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded disabled:opacity-30 hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
