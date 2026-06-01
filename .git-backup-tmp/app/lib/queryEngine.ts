import type {
  QueryGroup, QueryRule, QueryNode, QueryPreview,
  MockDataRecord, QueryResult, SchemaField
} from '../types/query';
import { OPERATORS_WITH_NO_VALUE, OPERATORS_WITH_RANGE, OPERATORS_WITH_ARRAY } from '../types/query';

// ─── SQL Generation ───────────────────────────────────────────────────────────
function ruleToSQL(rule: QueryRule, fields: SchemaField[]): string {
  const field = fields.find(f => f.key === rule.field);
  const label = field?.label ?? rule.field;
  const op = rule.operator;
  const val = rule.value;

  if (OPERATORS_WITH_NO_VALUE.includes(op)) {
    return op === 'is_null' ? `${label} IS NULL` : `${label} IS NOT NULL`;
  }

  const isStr = field?.type === 'string' || field?.type === 'enum';
  const quote = (v: unknown) => isStr ? `'${v}'` : `${v}`;

  if (OPERATORS_WITH_RANGE.includes(op) && Array.isArray(val)) {
    return `${label} BETWEEN ${quote(val[0])} AND ${quote(val[1])}`;
  }
  if (OPERATORS_WITH_ARRAY.includes(op) && Array.isArray(val)) {
    const list = val.map(v => quote(v)).join(', ');
    return op === 'in_array'
      ? `${label} IN (${list})`
      : `${label} NOT IN (${list})`;
  }

  const sqlOps: Record<string, string> = {
    equals: '=', not_equals: '!=',
    greater_than: '>', less_than: '<',
    greater_than_or_equals: '>=', less_than_or_equals: '<=',
    before: '<', after: '>',
  };
  if (sqlOps[op]) return `${label} ${sqlOps[op]} ${quote(val)}`;
  if (op === 'contains') return `${label} LIKE '%${val}%'`;
  if (op === 'not_contains') return `${label} NOT LIKE '%${val}%'`;
  if (op === 'starts_with') return `${label} LIKE '${val}%'`;
  if (op === 'ends_with') return `${label} LIKE '%${val}'`;
  if (op === 'regex') return `${label} REGEXP '${val}'`;

  return `${label} = ${quote(val)}`;
}

function groupToSQL(group: QueryGroup, fields: SchemaField[], depth = 0): string {
  if (!group.children.length) return '';
  const parts = group.children
    .map(child =>
      child.type === 'rule'
        ? ruleToSQL(child, fields)
        : groupToSQL(child, fields, depth + 1)
    )
    .filter(Boolean);
  if (!parts.length) return '';
  const joined = parts.join(` ${group.logic} `);
  return depth > 0 ? `(${joined})` : joined;
}

// ─── MongoDB Generation ───────────────────────────────────────────────────────
function ruleToMongo(rule: QueryRule): Record<string, unknown> {
  const op = rule.operator;
  const val = rule.value;
  const field = rule.field;

  if (op === 'is_null') return { [field]: null };
  if (op === 'is_not_null') return { [field]: { $ne: null } };
  if (op === 'equals') return { [field]: val };
  if (op === 'not_equals') return { [field]: { $ne: val } };
  if (op === 'greater_than') return { [field]: { $gt: val } };
  if (op === 'less_than') return { [field]: { $lt: val } };
  if (op === 'greater_than_or_equals') return { [field]: { $gte: val } };
  if (op === 'less_than_or_equals') return { [field]: { $lte: val } };
  if (op === 'before') return { [field]: { $lt: val } };
  if (op === 'after') return { [field]: { $gt: val } };
  if (op === 'contains') return { [field]: { $regex: val, $options: 'i' } };
  if (op === 'not_contains') return { [field]: { $not: { $regex: val, $options: 'i' } } };
  if (op === 'starts_with') return { [field]: { $regex: `^${val}`, $options: 'i' } };
  if (op === 'ends_with') return { [field]: { $regex: `${val}$`, $options: 'i' } };
  if (op === 'regex') return { [field]: { $regex: val } };
  if (op === 'in_array' && Array.isArray(val)) return { [field]: { $in: val } };
  if (op === 'not_in_array' && Array.isArray(val)) return { [field]: { $nin: val } };
  if (op === 'between' && Array.isArray(val)) return { [field]: { $gte: val[0], $lte: val[1] } };
  if (op === 'date_between' && Array.isArray(val)) return { [field]: { $gte: val[0], $lte: val[1] } };

  return { [field]: val };
}

function groupToMongo(group: QueryGroup): Record<string, unknown> {
  if (!group.children.length) return {};
  const parts = group.children.map(child =>
    child.type === 'rule' ? ruleToMongo(child) : groupToMongo(child)
  );
  const key = group.logic === 'AND' ? '$and' : '$or';
  return { [key]: parts };
}

// ─── GraphQL Generation ───────────────────────────────────────────────────────
function ruleToGraphQL(rule: QueryRule, indent = 2): string {
  const pad = ' '.repeat(indent);
  const op = rule.operator;
  const val = rule.value;
  const field = rule.field;

  const graphqlOps: Record<string, string> = {
    equals: 'eq', not_equals: 'neq',
    greater_than: 'gt', less_than: 'lt',
    greater_than_or_equals: 'gte', less_than_or_equals: 'lte',
    contains: 'contains', starts_with: 'startsWith', ends_with: 'endsWith',
    is_null: 'isNull', is_not_null: 'isNotNull',
    in_array: 'in', not_in_array: 'notIn',
    before: 'lt', after: 'gt',
  };

  const gqlOp = graphqlOps[op] ?? 'eq';
  const fmtVal = Array.isArray(val)
    ? `[${val.map(v => JSON.stringify(v)).join(', ')}]`
    : JSON.stringify(val);

  if (op === 'is_null' || op === 'is_not_null') {
    return `${pad}${field}: { ${gqlOp}: true }`;
  }

  return `${pad}${field}: { ${gqlOp}: ${fmtVal} }`;
}

function groupToGraphQL(group: QueryGroup, indent = 2): string {
  if (!group.children.length) return '';
  const pad = ' '.repeat(indent);
  const inner = group.children
    .map(child =>
      child.type === 'rule'
        ? ruleToGraphQL(child, indent + 2)
        : `${pad}  ${group.logic === 'AND' ? '_and' : '_or'}: {\n${groupToGraphQL(child, indent + 4)}\n${pad}  }`
    )
    .filter(Boolean)
    .join('\n');
  return inner;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function generateQueryPreview(root: QueryGroup, fields: SchemaField[]): QueryPreview {
  const sqlWhere = groupToSQL(root, fields);
  const sql = sqlWhere
    ? `SELECT *\nFROM ${fields.length ? 'records' : 'table'}\nWHERE ${sqlWhere}`
    : `SELECT * FROM records`;

  const mongoObj = groupToMongo(root);
  const mongo = Object.keys(mongoObj).length
    ? JSON.stringify(mongoObj, null, 2)
    : '{}';

  const gqlInner = groupToGraphQL(root, 4);
  const graphql = gqlInner
    ? `query {\n  records(\n    where: {\n${gqlInner}\n    }\n  ) {\n    id\n  }\n}`
    : `query {\n  records {\n    id\n  }\n}`;

  return { sql, mongo, graphql };
}

// ─── Query Execution ──────────────────────────────────────────────────────────
function evaluateRule(rule: QueryRule, record: MockDataRecord): boolean {
  const recordVal = record[rule.field];
  const ruleVal = rule.value;
  const op = rule.operator;

  if (op === 'is_null') return recordVal === null || recordVal === undefined;
  if (op === 'is_not_null') return recordVal !== null && recordVal !== undefined;

  if (typeof recordVal === 'string') {
    const rv = recordVal.toLowerCase();
    const rv2 = typeof ruleVal === 'string' ? ruleVal.toLowerCase() : '';
    if (op === 'equals') return rv === rv2;
    if (op === 'not_equals') return rv !== rv2;
    if (op === 'contains') return rv.includes(rv2);
    if (op === 'not_contains') return !rv.includes(rv2);
    if (op === 'starts_with') return rv.startsWith(rv2);
    if (op === 'ends_with') return rv.endsWith(rv2);
    if (op === 'regex') { try { return new RegExp(String(ruleVal), 'i').test(recordVal); } catch { return false; } }
    if (op === 'in_array' && Array.isArray(ruleVal)) return ruleVal.map(v => String(v).toLowerCase()).includes(rv);
    if (op === 'not_in_array' && Array.isArray(ruleVal)) return !ruleVal.map(v => String(v).toLowerCase()).includes(rv);
  }
  if (typeof recordVal === 'number') {
    const rv = Number(ruleVal);
    if (op === 'equals') return recordVal === rv;
    if (op === 'not_equals') return recordVal !== rv;
    if (op === 'greater_than') return recordVal > rv;
    if (op === 'less_than') return recordVal < rv;
    if (op === 'greater_than_or_equals') return recordVal >= rv;
    if (op === 'less_than_or_equals') return recordVal <= rv;
    if (op === 'between' && Array.isArray(ruleVal)) return recordVal >= Number(ruleVal[0]) && recordVal <= Number(ruleVal[1]);
  }
  if (typeof recordVal === 'boolean') {
    if (op === 'equals') return recordVal === (ruleVal === 'true' || ruleVal === true);
    if (op === 'not_equals') return recordVal !== (ruleVal === 'true' || ruleVal === true);
  }
  if (typeof recordVal === 'string' && (op === 'before' || op === 'after' || op === 'date_between')) {
    const d = new Date(recordVal).getTime();
    if (op === 'before') return d < new Date(String(ruleVal)).getTime();
    if (op === 'after') return d > new Date(String(ruleVal)).getTime();
    if (op === 'date_between' && Array.isArray(ruleVal)) {
      return d >= new Date(String(ruleVal[0])).getTime() && d <= new Date(String(ruleVal[1])).getTime();
    }
  }
  return false;
}

function evaluateGroup(group: QueryGroup, record: MockDataRecord): boolean {
  if (!group.children.length) return true;
  if (group.logic === 'AND') {
    return group.children.every(child =>
      child.type === 'rule' ? evaluateRule(child, record) : evaluateGroup(child, record)
    );
  }
  return group.children.some(child =>
    child.type === 'rule' ? evaluateRule(child, record) : evaluateGroup(child, record)
  );
}

export function executeQuery(root: QueryGroup, data: MockDataRecord[]): QueryResult {
  const start = performance.now();
  const records = data.filter(record => evaluateGroup(root, record));
  const executionTime = parseFloat((performance.now() - start).toFixed(2));
  return { records, total: data.length, filtered: records.length, executionTime };
}

// ─── Validation ───────────────────────────────────────────────────────────────
export interface ValidationError {
  nodeId: string;
  message: string;
}

export function validateQuery(node: QueryNode, errors: ValidationError[] = []): ValidationError[] {
  if (node.type === 'rule') {
    if (!node.field) errors.push({ nodeId: node.id, message: 'Field is required' });
    if (!node.operator) errors.push({ nodeId: node.id, message: 'Operator is required' });
    if (!OPERATORS_WITH_NO_VALUE.includes(node.operator)) {
      if (OPERATORS_WITH_RANGE.includes(node.operator)) {
        if (!Array.isArray(node.value) || node.value.length !== 2) {
          errors.push({ nodeId: node.id, message: 'Range requires two values' });
        }
      } else if (OPERATORS_WITH_ARRAY.includes(node.operator)) {
        if (!Array.isArray(node.value) || node.value.length === 0) {
          errors.push({ nodeId: node.id, message: 'Array requires at least one value' });
        }
      } else if (node.value === '' || node.value === null || node.value === undefined) {
        errors.push({ nodeId: node.id, message: 'Value is required' });
      }
    }
  } else {
    if (node.children.length === 0) {
      errors.push({ nodeId: node.id, message: 'Group must have at least one condition' });
    }
    node.children.forEach(child => validateQuery(child, errors));
  }
  return errors;
}
