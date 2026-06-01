export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';

export type Operator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than'
  | 'greater_than_or_equals' | 'less_than_or_equals'
  | 'in_array' | 'not_in_array'
  | 'between'
  | 'is_null' | 'is_not_null'
  | 'regex'
  | 'before' | 'after' | 'date_between';

export type LogicOperator = 'AND' | 'OR';

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  enumValues?: string[];
}

export interface Schema {
  id: string;
  name: string;
  fields: SchemaField[];
}

export interface QueryRule {
  id: string;
  type: 'rule';
  field: string;
  operator: Operator;
  value: string | number | boolean | string[] | [number, number] | null;
}

export interface QueryGroup {
  id: string;
  type: 'group';
  logic: LogicOperator;
  children: (QueryRule | QueryGroup)[];
  collapsed?: boolean;
}

export type QueryNode = QueryRule | QueryGroup;

export interface QueryState {
  root: QueryGroup;
  activeSchemaId: string;
}

export interface QueryPreview {
  sql: string;
  mongo: string;
  graphql: string;
}

export interface MockDataRecord {
  [key: string]: string | number | boolean | null | string[];
}

export interface QueryResult {
  records: MockDataRecord[];
  total: number;
  filtered: number;
  executionTime: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  root: QueryGroup;
  schemaId: string;
  createdAt: string;
}

export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'in_array', 'not_in_array', 'is_null', 'is_not_null', 'regex'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equals', 'less_than_or_equals', 'between', 'is_null', 'is_not_null'],
  boolean: ['equals', 'not_equals', 'is_null', 'is_not_null'],
  date: ['equals', 'not_equals', 'before', 'after', 'date_between', 'is_null', 'is_not_null'],
  enum: ['equals', 'not_equals', 'in_array', 'not_in_array', 'is_null', 'is_not_null'],
  array: ['in_array', 'not_in_array', 'is_null', 'is_not_null'],
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'equals',
  not_equals: 'not equals',
  contains: 'contains',
  not_contains: 'not contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  greater_than: 'greater than',
  less_than: 'less than',
  greater_than_or_equals: 'greater than or equal to',
  less_than_or_equals: 'less than or equal to',
  in_array: 'in array',
  not_in_array: 'not in array',
  between: 'between',
  is_null: 'is null',
  is_not_null: 'is not null',
  regex: 'matches regex',
  before: 'before',
  after: 'after',
  date_between: 'between dates',
};

export const OPERATORS_WITH_NO_VALUE: Operator[] = ['is_null', 'is_not_null'];
export const OPERATORS_WITH_RANGE: Operator[] = ['between', 'date_between'];
export const OPERATORS_WITH_ARRAY: Operator[] = ['in_array', 'not_in_array'];
