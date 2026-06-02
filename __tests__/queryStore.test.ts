import { describe, it, expect, beforeEach } from 'vitest';
import { useQueryStore } from '../app/store/queryStore';

describe('queryStore', () => {
  beforeEach(() => {
    useQueryStore.getState().resetQuery();
  });

  it('initializes with default state', () => {
    const state = useQueryStore.getState();
    expect(state.activeSchemaId).toBe('users');
    expect(state.root.type).toBe('group');
    expect(state.root.children.length).toBe(1);
    expect(state.history.length).toBeGreaterThan(0);
  });

  it('can set schema and reset root', () => {
    useQueryStore.getState().setSchema('products');
    const state = useQueryStore.getState();
    expect(state.activeSchemaId).toBe('products');
    expect(state.root.children.length).toBe(1);
    // history should record this
    expect(state.historyIndex).toBeGreaterThan(0);
  });

  it('can add a rule to a group', () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().addRule(rootId);
    
    const state = useQueryStore.getState();
    expect(state.root.children.length).toBe(2);
    expect(state.root.children[1].type).toBe('rule');
  });

  it('can add a group to a group', () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().addGroup(rootId);
    
    const state = useQueryStore.getState();
    expect(state.root.children.length).toBe(2);
    expect(state.root.children[1].type).toBe('group');
  });

  it('can remove a node', () => {
    const rootId = useQueryStore.getState().root.id;
    const ruleId = useQueryStore.getState().root.children[0].id;
    
    useQueryStore.getState().removeNode(ruleId);
    const state = useQueryStore.getState();
    expect(state.root.children.length).toBe(0);
  });

  it('can update a rule', () => {
    const ruleId = useQueryStore.getState().root.children[0].id;
    
    useQueryStore.getState().updateRule(ruleId, { value: 25 });
    const state = useQueryStore.getState();
    
    // @ts-ignore
    expect(state.root.children[0].value).toBe(25);
  });

  it('can update group logic', () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().updateGroupLogic(rootId, 'OR');
    
    const state = useQueryStore.getState();
    expect(state.root.logic).toBe('OR');
  });

  it('can undo and redo', () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().updateGroupLogic(rootId, 'OR');
    
    expect(useQueryStore.getState().root.logic).toBe('OR');
    
    useQueryStore.getState().undo();
    expect(useQueryStore.getState().root.logic).toBe('AND');
    
    useQueryStore.getState().redo();
    expect(useQueryStore.getState().root.logic).toBe('OR');
  });

  describe('importQuery', () => {
    it('can import a valid query JSON', () => {
      const validQuery = {
        schemaId: 'products',
        root: {
          id: 'test-group-id',
          type: 'group',
          logic: 'OR',
          children: [
            {
              id: 'test-rule-id',
              type: 'rule',
              field: 'price',
              operator: 'greater_than',
              value: 100
            }
          ],
          collapsed: false
        }
      };

      useQueryStore.getState().importQuery(JSON.stringify(validQuery));
      
      const state = useQueryStore.getState();
      expect(state.activeSchemaId).toBe('products');
      expect(state.root.id).toBe('test-group-id');
      expect(state.root.logic).toBe('OR');
      expect(state.root.children.length).toBe(1);
      expect(state.root.children[0].type).toBe('rule');
      // @ts-ignore
      expect(state.root.children[0].field).toBe('price');
    });

    it('throws an error for invalid JSON', () => {
      expect(() => {
        useQueryStore.getState().importQuery('invalid json');
      }).toThrow('File is not valid JSON.');
    });

    it('throws an error if root or schemaId is missing', () => {
      expect(() => {
        useQueryStore.getState().importQuery(JSON.stringify({ schemaId: 'products' }));
      }).toThrow('JSON must have a "root" and "schemaId" field.');
    });

    it('normalizes missing properties of an imported query root and its children', () => {
      const partiallyValidQuery = {
        schemaId: 'users',
        root: {
          // missing id, type, logic, children, collapsed
        }
      };

      useQueryStore.getState().importQuery(JSON.stringify(partiallyValidQuery));

      const state = useQueryStore.getState();
      expect(state.activeSchemaId).toBe('users');
      expect(state.root.id).toBeDefined();
      expect(state.root.type).toBe('group');
      expect(state.root.logic).toBe('AND');
      expect(state.root.children).toBeDefined();
      expect(state.root.children.length).toBe(0);
      expect(state.root.collapsed).toBe(false);
    });
  });
});
