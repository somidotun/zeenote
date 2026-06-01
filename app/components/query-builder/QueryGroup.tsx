'use client';
import { memo, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { QueryGroup, QueryRule as QueryRuleType, SchemaField } from '../../types/query';
import { useQueryStore } from '../../store/queryStore';
import { useShallow } from 'zustand/shallow';
import { QueryRuleComponent } from './QueryRule';

interface Props {
  group: QueryGroup;
  fields: SchemaField[];
  depth?: number;
  isRoot?: boolean;
  validationErrors?: { nodeId: string; message: string }[];
}

const DEPTH_COLORS = ['var(--depth-0)', 'var(--depth-1)', 'var(--depth-2)', 'var(--depth-3)', 'var(--depth-4)'];

export const QueryGroupComponent = memo(function QueryGroupComponent({
  group, fields, depth = 0, isRoot = false, validationErrors = [],
}: Props) {
  const {
    addRule, addGroup, removeNode,
    updateGroupLogic, toggleGroupCollapse, reorderChildren,
  } = useQueryStore(
    useShallow(s => ({
      addRule: s.addRule,
      addGroup: s.addGroup,
      removeNode: s.removeNode,
      updateGroupLogic: s.updateGroupLogic,
      toggleGroupCollapse: s.toggleGroupCollapse,
      reorderChildren: s.reorderChildren,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.children.findIndex(c => c.id === active.id);
    const newIndex = group.children.findIndex(c => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderChildren(group.id, oldIndex, newIndex);
    }
  }, [group.children, group.id, reorderChildren]);

  const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  const isAnd = group.logic === 'AND';
  const groupError = validationErrors.find(e => e.nodeId === group.id);

  const groupBg = isAnd ? 'var(--group-and-bg)' : 'var(--group-or-bg)';
  const groupBorder = isAnd ? 'var(--group-and-border)' : 'var(--group-or-border)';
  const logicColor = isAnd ? 'var(--group-and-label)' : 'var(--group-or-label)';

  return (
    <div
      className="relative animate-fade-in"
      style={{ marginLeft: isRoot ? 0 : 'var(--indent-size)' }}
    >
      {/* Left border line */}
      {!isRoot && (
        <div
          className="absolute -left-3 top-0 bottom-0 w-[2px] rounded-full opacity-60"
          style={{ background: depthColor }}
        />
      )}

      <div
        className="rounded-[var(--radius-lg)] border transition-all duration-200"
        style={{
          background: groupBg,
          borderColor: groupError ? 'var(--color-danger)' : groupBorder,
          borderWidth: isRoot ? '1.5px' : '1px',
        }}
      >
        {/* Group Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: groupBorder }}>
          {/* Collapse toggle */}
          <button
            onClick={() => toggleGroupCollapse(group.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={group.collapsed ? 'Expand group' : 'Collapse group'}
          >
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
              className="transition-transform duration-200"
              style={{ transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Logic toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-overlay)] rounded-[var(--radius-sm)] p-0.5">
            {(['AND', 'OR'] as const).map(op => (
              <button
                key={op}
                onClick={() => updateGroupLogic(group.id, op)}
                className="px-2.5 py-0.5 rounded text-xs font-bold transition-all duration-150"
                style={{
                  background: group.logic === op ? logicColor : 'transparent',
                  color: group.logic === op ? '#000' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
                aria-pressed={group.logic === op}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Group label */}
          <span
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: logicColor, fontFamily: 'var(--font-mono)' }}
          >
            {isRoot ? 'root' : `group`}
          </span>

          {/* Condition count */}
          {group.collapsed && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {group.children.length} condition{group.children.length !== 1 ? 's' : ''}
            </span>
          )}

          <div className="flex-1" />

          {/* Add rule */}
          <button
            onClick={() => addRule(group.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
            title="Add rule (A)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 1v8M1 5h8"/>
            </svg>
            rule
          </button>

          {/* Add group */}
          <button
            onClick={() => addGroup(group.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
            title="Add group (G)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 1v8M1 5h8"/>
            </svg>
            group
          </button>

          {/* Remove group (not root) */}
          {!isRoot && (
            <button
              onClick={() => removeNode(group.id)}
              className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-red-950/30 transition-all"
              title="Remove group"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Group error */}
        {groupError && (
          <div className="px-3 py-1.5 text-xs text-[var(--color-danger)] border-b" style={{ borderColor: 'var(--border-danger)' }}>
            ⚠ {groupError.message}
          </div>
        )}

        {/* Children */}
        {!group.collapsed && (
          <div className="p-2 flex flex-col gap-1.5">
            {group.children.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-tertiary)] italic">
                No conditions yet.{' '}
                <button
                  onClick={() => addRule(group.id)}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Add one
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={group.children.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div suppressHydrationWarning>
                  {group.children.map((child, index) => {
                    const childError = validationErrors.some(e => e.nodeId === child.id);

                    // Logic separator between children
                    return (
                      <div key={child.id}>
                        {index > 0 && (
                          <div className="flex items-center gap-2 py-0.5 px-2">
                            <div className="h-px flex-1" style={{ background: groupBorder }} />
                            <span
                              className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                              style={{
                                color: logicColor,
                                background: groupBg,
                                border: `1px solid ${groupBorder}`,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {group.logic}
                            </span>
                            <div className="h-px flex-1" style={{ background: groupBorder }} />
                          </div>
                        )}
                        {child.type === 'rule' ? (
                          <QueryRuleComponent
                            rule={child as QueryRuleType}
                            fields={fields}
                            depth={depth}
                            hasError={childError}
                          />
                        ) : (
                          <QueryGroupComponent
                            group={child as QueryGroup}
                            fields={fields}
                            depth={depth + 1}
                            validationErrors={validationErrors}
                          />
                        )}
                      </div>
                    );
                  })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
