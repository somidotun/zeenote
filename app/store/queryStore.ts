import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { QueryGroup, QueryRule, QueryNode, LogicOperator, Operator, SavedQuery } from '../types/query';
import { OPERATORS_BY_TYPE, OPERATORS_WITH_NO_VALUE } from '../types/query';
import { SCHEMAS } from '../lib/schemas';

function defaultRule(schemaId: string): QueryRule {
  const schema = SCHEMAS.find(s => s.id === schemaId);
  const firstField = schema?.fields[0];
  const firstOperator = firstField
    ? (OPERATORS_BY_TYPE[firstField.type][0] as Operator)
    : 'equals' as Operator;
  return {
    id: uuid(),
    type: 'rule',
    field: firstField?.key ?? '',
    operator: firstOperator,
    value: OPERATORS_WITH_NO_VALUE.includes(firstOperator) ? null : '',
  };
}

function defaultGroup(schemaId: string, withRule = true): QueryGroup {
  const group: QueryGroup = {
    id: uuid(),
    type: 'group',
    logic: 'AND',
    children: [],
    collapsed: false,
  };
  if (withRule) group.children.push(defaultRule(schemaId));
  return group;
}

// Deep clone helper
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Find and update node by ID (recursive)
function updateNodeById(
  group: QueryGroup,
  id: string,
  updater: (node: QueryNode) => QueryNode | null
): QueryGroup {
  const newChildren: QueryNode[] = [];
  for (const child of group.children) {
    if (child.id === id) {
      const updated = updater(child);
      if (updated !== null) newChildren.push(updated);
    } else if (child.type === 'group') {
      newChildren.push(updateNodeById(child, id, updater));
    } else {
      newChildren.push(child);
    }
  }
  if (group.id === id) {
    const updated = updater(group);
    if (updated === null) return group;
    return updated as QueryGroup;
  }
  return { ...group, children: newChildren };
}

// Add child to group
function addChildToGroup(
  root: QueryGroup,
  groupId: string,
  child: QueryNode
): QueryGroup {
  if (root.id === groupId) {
    return { ...root, children: [...root.children, child] };
  }
  return {
    ...root,
    children: root.children.map(c =>
      c.type === 'group' ? addChildToGroup(c, groupId, child) : c
    ),
  };
}

// Remove node from tree
function removeNode(root: QueryGroup, nodeId: string): QueryGroup {
  return {
    ...root,
    children: root.children
      .filter(c => c.id !== nodeId)
      .map(c => (c.type === 'group' ? removeNode(c, nodeId) : c)),
  };
}

// Reorder children within a group
function reorderChildren(
  root: QueryGroup,
  groupId: string,
  oldIndex: number,
  newIndex: number
): QueryGroup {
  if (root.id === groupId) {
    const children = [...root.children];
    const [removed] = children.splice(oldIndex, 1);
    children.splice(newIndex, 0, removed);
    return { ...root, children };
  }
  return {
    ...root,
    children: root.children.map(c =>
      c.type === 'group' ? reorderChildren(c, groupId, oldIndex, newIndex) : c
    ),
  };
}

// History entry
interface HistoryEntry {
  root: QueryGroup;
  schemaId: string;
  timestamp: number;
  label: string;
}

interface QueryStore {
  root: QueryGroup;
  activeSchemaId: string;
  previewMode: 'sql' | 'mongo' | 'graphql';
  theme: 'dark' | 'light';
  history: HistoryEntry[];
  historyIndex: number;
  savedQueries: SavedQuery[];
  validationErrors: { nodeId: string; message: string }[];

  // Actions
  setSchema: (schemaId: string) => void;
  addRule: (groupId: string) => void;
  addGroup: (groupId: string) => void;
  removeNode: (nodeId: string) => void;
  updateRule: (ruleId: string, updates: Partial<QueryRule>) => void;
  updateGroupLogic: (groupId: string, logic: LogicOperator) => void;
  toggleGroupCollapse: (groupId: string) => void;
  reorderChildren: (groupId: string, oldIndex: number, newIndex: number) => void;
  resetQuery: () => void;
  setPreviewMode: (mode: 'sql' | 'mongo' | 'graphql') => void;
  toggleTheme: () => void;
  undo: () => void;
  redo: () => void;
  saveQuery: (name: string) => void;
  loadSavedQuery: (id: string) => void;
  deleteSavedQuery: (id: string) => void;
  importQuery: (json: string) => void;
  setValidationErrors: (errors: { nodeId: string; message: string }[]) => void;
}

const INITIAL_SCHEMA = 'users';
const INITIAL_ROOT = defaultGroup(INITIAL_SCHEMA, true);

export const useQueryStore = create<QueryStore>((set, get) => ({
  root: INITIAL_ROOT,
  activeSchemaId: INITIAL_SCHEMA,
  previewMode: 'sql',
  theme: 'dark',
  history: [{ root: deepClone(INITIAL_ROOT), schemaId: INITIAL_SCHEMA, timestamp: Date.now(), label: 'Initial' }],
  historyIndex: 0,
  savedQueries: [],
  validationErrors: [],

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  setSchema: (schemaId) => {
    const newRoot = defaultGroup(schemaId, true);
    set(state => {
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        activeSchemaId: schemaId,
        history: [...history, { root: deepClone(newRoot), schemaId, timestamp: Date.now(), label: `Schema: ${schemaId}` }],
        historyIndex: history.length,
        validationErrors: [],
      };
    });
  },

  addRule: (groupId) => {
    set(state => {
      const rule = defaultRule(state.activeSchemaId);
      const newRoot = addChildToGroup(state.root, groupId, rule);
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Add rule' }],
        historyIndex: history.length,
      };
    });
  },

  addGroup: (groupId) => {
    set(state => {
      const group = defaultGroup(state.activeSchemaId, true);
      group.logic = 'OR';
      const newRoot = addChildToGroup(state.root, groupId, group);
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Add group' }],
        historyIndex: history.length,
      };
    });
  },

  removeNode: (nodeId) => {
    set(state => {
      const newRoot = removeNode(state.root, nodeId);
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Remove node' }],
        historyIndex: history.length,
      };
    });
  },

  updateRule: (ruleId, updates) => {
    set(state => {
      const newRoot = updateNodeById(state.root, ruleId, (node) => {
        if (node.type !== 'rule') return node;
        const updated = { ...node, ...updates };
        // Reset value when field type changes
        if (updates.field && updates.field !== node.field) {
          const schema = SCHEMAS.find(s => s.id === state.activeSchemaId);
          const newField = schema?.fields.find(f => f.key === updates.field);
          if (newField) {
            const ops = OPERATORS_BY_TYPE[newField.type];
            updated.operator = ops[0] as Operator;
            updated.value = OPERATORS_WITH_NO_VALUE.includes(ops[0] as Operator) ? null : '';
          }
        }
        // Reset value when operator changes
        if (updates.operator && updates.operator !== node.operator) {
          if (OPERATORS_WITH_NO_VALUE.includes(updates.operator)) {
            updated.value = null;
          } else if (node.value === null) {
            updated.value = '';
          }
        }
        return updated;
      });
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Update rule' }],
        historyIndex: history.length,
      };
    });
  },

  updateGroupLogic: (groupId, logic) => {
    set(state => {
      const newRoot = updateNodeById(state.root, groupId, (node) => {
        if (node.type !== 'group') return node;
        return { ...node, logic };
      }) as QueryGroup;
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Update logic' }],
        historyIndex: history.length,
      };
    });
  },

  toggleGroupCollapse: (groupId) => {
    set(state => {
      const newRoot = updateNodeById(state.root, groupId, (node) => {
        if (node.type !== 'group') return node;
        return { ...node, collapsed: !node.collapsed };
      }) as QueryGroup;
      return { root: newRoot };
    });
  },

  reorderChildren: (groupId, oldIndex, newIndex) => {
    set(state => {
      const newRoot = reorderChildren(state.root, groupId, oldIndex, newIndex);
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Reorder' }],
        historyIndex: history.length,
      };
    });
  },

  resetQuery: () => {
    const newRoot = defaultGroup(get().activeSchemaId, true);
    set(state => {
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: newRoot,
        history: [...history, { root: deepClone(newRoot), schemaId: state.activeSchemaId, timestamp: Date.now(), label: 'Reset' }],
        historyIndex: history.length,
        validationErrors: [],
      };
    });
  },

  setPreviewMode: (mode) => set({ previewMode: mode }),

  toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  undo: () => {
    set(state => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return { root: deepClone(entry.root), activeSchemaId: entry.schemaId, historyIndex: newIndex };
    });
  },

  redo: () => {
    set(state => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return { root: deepClone(entry.root), activeSchemaId: entry.schemaId, historyIndex: newIndex };
    });
  },

  saveQuery: (name) => {
    set(state => {
      const saved: SavedQuery = {
        id: uuid(),
        name,
        root: deepClone(state.root),
        schemaId: state.activeSchemaId,
        createdAt: new Date().toISOString(),
      };
      return { savedQueries: [...state.savedQueries, saved] };
    });
  },

  loadSavedQuery: (id) => {
    const saved = get().savedQueries.find(q => q.id === id);
    if (!saved) return;
    set(state => {
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: deepClone(saved.root),
        activeSchemaId: saved.schemaId,
        history: [...history, { root: deepClone(saved.root), schemaId: saved.schemaId, timestamp: Date.now(), label: `Load: ${saved.name}` }],
        historyIndex: history.length,
        validationErrors: [],
      };
    });
  },

  deleteSavedQuery: (id) => {
    set(state => ({ savedQueries: state.savedQueries.filter(q => q.id !== id) }));
  },

  importQuery: (json) => {
    let parsed: { root?: unknown; schemaId?: unknown };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('File is not valid JSON.');
    }
    if (!parsed.root || !parsed.schemaId) {
      throw new Error(
        'JSON must have a "root" and "schemaId" field. Export a query first to get the correct format.'
      );
    }
    set(state => {
      const history = state.history.slice(0, state.historyIndex + 1);
      return {
        root: parsed.root as QueryGroup,
        activeSchemaId: parsed.schemaId as string,
        history: [...history, { root: deepClone(parsed.root as QueryGroup), schemaId: parsed.schemaId as string, timestamp: Date.now(), label: 'Import' }],
        historyIndex: history.length,
      };
    });
  },
}));
