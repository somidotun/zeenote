import { describe, it, expect } from 'vitest';
import { generateQueryPreview, executeQuery, validateQuery } from '../app/lib/queryEngine';
import type { QueryGroup, QueryRule, SchemaField } from '../app/types/query';

const mockFields: SchemaField[] = [
  { key: 'name', label: 'Name', type: 'string' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'status', label: 'Status', type: 'enum', enumValues: ['active', 'inactive'] },
  { key: 'verified', label: 'Verified', type: 'boolean' },
  { key: 'createdAt', label: 'Created At', type: 'date' },
];

function makeGroup(logic: 'AND' | 'OR', children: (QueryRule | QueryGroup)[] = []): QueryGroup {
  return { id: 'g1', type: 'group', logic, children };
}

function makeRule(overrides: Partial<QueryRule> = {}): QueryRule {
  return {
    id: 'r1',
    type: 'rule',
    field: 'age',
    operator: 'greater_than',
    value: 18,
    ...overrides,
  };
}

// ─── generateQueryPreview ─────────────────────────────────────────────────────
describe('generateQueryPreview', () => {
  it('generates SQL for a simple rule', () => {
    const root = makeGroup('AND', [makeRule()]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('WHERE');
    expect(sql).toContain('Age');
    expect(sql).toContain('>');
    expect(sql).toContain('18');
  });

  it('generates SQL with AND logic', () => {
    const root = makeGroup('AND', [
      makeRule({ id: 'r1', field: 'age', operator: 'greater_than', value: 18 }),
      makeRule({ id: 'r2', field: 'status', operator: 'equals', value: 'active' }),
    ]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('AND');
  });

  it('generates SQL with OR logic', () => {
    const root = makeGroup('OR', [
      makeRule({ id: 'r1', field: 'age', operator: 'greater_than', value: 18 }),
      makeRule({ id: 'r2', field: 'age', operator: 'less_than', value: 10 }),
    ]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('OR');
  });

  it('generates SQL for is_null operator', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'is_null', value: null })]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('IS NULL');
  });

  it('generates SQL for between operator', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'between', value: [10, 20] })]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('BETWEEN');
    expect(sql).toContain('10');
    expect(sql).toContain('20');
  });

  it('generates SQL for in_array operator', () => {
    const root = makeGroup('AND', [makeRule({ field: 'status', operator: 'in_array', value: ['active', 'pending'] })]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('IN');
  });

  it('generates SQL for contains operator', () => {
    const root = makeGroup('AND', [makeRule({ field: 'name', operator: 'contains', value: 'Alice' })]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('LIKE');
    expect(sql).toContain('%Alice%');
  });

  it('generates MongoDB query', () => {
    const root = makeGroup('AND', [makeRule()]);
    const { mongo } = generateQueryPreview(root, mockFields);
    expect(mongo).toContain('$and');
    expect(mongo).toContain('$gt');
  });

  it('generates empty SQL without WHERE for empty group', () => {
    const root = makeGroup('AND', []);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).not.toContain('WHERE');
  });

  it('generates nested SQL with parentheses', () => {
    const inner = makeGroup('OR', [
      makeRule({ id: 'r2', field: 'age', operator: 'greater_than', value: 30 }),
      makeRule({ id: 'r3', field: 'status', operator: 'equals', value: 'active' }),
    ]);
    inner.id = 'g2';
    const root = makeGroup('AND', [makeRule(), inner]);
    const { sql } = generateQueryPreview(root, mockFields);
    expect(sql).toContain('(');
    expect(sql).toContain(')');
    expect(sql).toContain('AND');
    expect(sql).toContain('OR');
  });
});

// ─── executeQuery ─────────────────────────────────────────────────────────────
describe('executeQuery', () => {
  const data = [
    { name: 'Alice', age: 25, status: 'active', verified: true, createdAt: '2023-01-01' },
    { name: 'Bob',   age: 17, status: 'inactive', verified: false, createdAt: '2022-05-10' },
    { name: 'Carol', age: 30, status: 'active', verified: true, createdAt: '2024-03-15' },
  ];

  it('filters by number greater_than', () => {
    const root = makeGroup('AND', [makeRule({ field: 'age', operator: 'greater_than', value: 18 })]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(2);
    expect(result.records.every(r => (r.age as number) > 18)).toBe(true);
  });

  it('filters by string equals', () => {
    const root = makeGroup('AND', [makeRule({ field: 'status', operator: 'equals', value: 'active' })]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(2);
  });

  it('filters by boolean', () => {
    const root = makeGroup('AND', [makeRule({ field: 'verified', operator: 'equals', value: 'true' })]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(2);
  });

  it('applies AND logic correctly', () => {
    const root = makeGroup('AND', [
      makeRule({ id: 'r1', field: 'age', operator: 'greater_than', value: 18 }),
      makeRule({ id: 'r2', field: 'status', operator: 'equals', value: 'active' }),
    ]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(2);
  });

  it('applies OR logic correctly', () => {
    const root = makeGroup('OR', [
      makeRule({ id: 'r1', field: 'age', operator: 'less_than', value: 18 }),
      makeRule({ id: 'r2', field: 'name', operator: 'equals', value: 'Carol' }),
    ]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(2); // Bob (< 18) + Carol
  });

  it('returns all records when group is empty', () => {
    const root = makeGroup('AND', []);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(3);
  });

  it('handles string contains', () => {
    const root = makeGroup('AND', [makeRule({ field: 'name', operator: 'contains', value: 'a' })]);
    const result = executeQuery(root, data);
    // Alice has 'a', Carol has 'a' (case-insensitive)
    expect(result.filtered).toBeGreaterThanOrEqual(1);
  });

  it('handles is_null', () => {
    const dataWithNull = [...data, { name: null as unknown as string, age: 40, status: 'active', verified: true, createdAt: '2024-01-01' }];
    const root = makeGroup('AND', [makeRule({ field: 'name', operator: 'is_null', value: null })]);
    const result = executeQuery(root, dataWithNull);
    expect(result.filtered).toBe(1);
  });

  it('handles between operator', () => {
    const root = makeGroup('AND', [makeRule({ field: 'age', operator: 'between', value: [20, 28] })]);
    const result = executeQuery(root, data);
    expect(result.records.every(r => (r.age as number) >= 20 && (r.age as number) <= 28)).toBe(true);
  });

  it('handles nested groups', () => {
    // (age > 18 AND status = active) OR (name = Bob)
    const innerGroup: QueryGroup = {
      id: 'g2', type: 'group', logic: 'AND',
      children: [
        makeRule({ id: 'r1', field: 'age', operator: 'greater_than', value: 18 }),
        makeRule({ id: 'r2', field: 'status', operator: 'equals', value: 'active' }),
      ],
    };
    const root = makeGroup('OR', [
      innerGroup,
      makeRule({ id: 'r3', field: 'name', operator: 'equals', value: 'Bob' }),
    ]);
    const result = executeQuery(root, data);
    expect(result.filtered).toBe(3); // Alice (active,>18), Carol (active,>18), Bob (name=Bob)
  });

  it('returns correct total count', () => {
    const root = makeGroup('AND', [makeRule()]);
    const result = executeQuery(root, data);
    expect(result.total).toBe(3);
  });
});

// ─── validateQuery ────────────────────────────────────────────────────────────
describe('validateQuery', () => {
  it('passes for valid rule', () => {
    const root = makeGroup('AND', [makeRule()]);
    const errors = validateQuery(root);
    expect(errors).toHaveLength(0);
  });

  it('errors on missing field', () => {
    const root = makeGroup('AND', [makeRule({ field: '' })]);
    const errors = validateQuery(root);
    expect(errors.some(e => e.message.toLowerCase().includes('field'))).toBe(true);
  });

  it('errors on missing value for non-null operators', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'equals', value: '' })]);
    const errors = validateQuery(root);
    expect(errors.some(e => e.message.toLowerCase().includes('value'))).toBe(true);
  });

  it('no error for is_null (no value needed)', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'is_null', value: null })]);
    const errors = validateQuery(root);
    expect(errors).toHaveLength(0);
  });

  it('errors for empty group', () => {
    const root = makeGroup('AND', []);
    const errors = validateQuery(root);
    expect(errors.some(e => e.message.toLowerCase().includes('group'))).toBe(true);
  });

  it('errors for between without proper range', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'between', value: '10' as unknown as number })]);
    const errors = validateQuery(root);
    expect(errors.some(e => e.nodeId === 'r1')).toBe(true);
  });

  it('errors for in_array without values', () => {
    const root = makeGroup('AND', [makeRule({ operator: 'in_array', value: [] })]);
    const errors = validateQuery(root);
    expect(errors.some(e => e.nodeId === 'r1')).toBe(true);
  });

  it('validates nested groups recursively', () => {
    const inner: QueryGroup = { id: 'g2', type: 'group', logic: 'AND', children: [] };
    const root = makeGroup('AND', [inner]);
    const errors = validateQuery(root);
    // root has 1 child (the inner group), inner group is empty
    expect(errors.some(e => e.nodeId === 'g2')).toBe(true);
  });
});
