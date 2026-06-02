"use client";
import { memo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QueryRule, SchemaField, Operator } from "../../types/query";
import {
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  OPERATORS_WITH_NO_VALUE,
  OPERATORS_WITH_RANGE,
  OPERATORS_WITH_ARRAY,
} from "../../types/query";
import { useQueryStore } from "../../store/queryStore";
import { useShallow } from "zustand/shallow";

interface Props {
  rule: QueryRule;
  fields: SchemaField[];
  depth: number;
  hasError?: boolean;
}

function ValueInput({
  rule,
  field,
}: {
  rule: QueryRule;
  field: SchemaField | undefined;
}) {
  const updateRule = useQueryStore((s) => s.updateRule);

  const inputClass = `
    bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)]
    text-[var(--text-primary)] text-sm px-3 py-1.5 h-8
    focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_0_2px_rgba(243,91,37,0.15)]
    transition-all duration-150 min-w-0
  `;

  if (OPERATORS_WITH_NO_VALUE.includes(rule.operator)) {
    return (
      <span className="text-[var(--text-tertiary)] text-xs italic px-2">
        no value needed
      </span>
    );
  }

  if (OPERATORS_WITH_RANGE.includes(rule.operator)) {
    const vals = Array.isArray(rule.value)
      ? (rule.value as [string, string])
      : ["", ""];
    const isDate = rule.operator === "date_between";
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          type={isDate ? "date" : "number"}
          value={vals[0] ?? ""}
          onChange={(e) =>
            updateRule(rule.id, { value: [e.target.value, vals[1]] })
          }
          className={`${inputClass} flex-1 min-w-0`}
          placeholder="from"
        />
        <span className="text-[var(--text-tertiary)] text-xs flex-shrink-0">to</span>
        <input
          type={isDate ? "date" : "number"}
          value={vals[1] ?? ""}
          onChange={(e) =>
            updateRule(rule.id, { value: [vals[0], e.target.value] })
          }
          className={`${inputClass} flex-1 min-w-0`}
          placeholder="to"
        />
      </div>
    );
  }

  if (OPERATORS_WITH_ARRAY.includes(rule.operator)) {
    const vals = Array.isArray(rule.value) ? (rule.value as string[]) : [];
    return (
      <input
        type="text"
        value={vals.join(", ")}
        onChange={(e) =>
          updateRule(rule.id, {
            value: e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          })
        }
        className={`${inputClass} w-full`}
        placeholder="val1, val2, val3"
        title="Comma-separated values"
      />
    );
  }

  if (field?.type === "enum" && field.enumValues) {
    return (
      <select
        value={String(rule.value ?? "")}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
        className={`${inputClass} w-full`}
      >
        <option value="">Select...</option>
        {field.enumValues.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }

  if (field?.type === "boolean") {
    return (
      <select
        value={String(rule.value ?? "")}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
        className={`${inputClass} w-full`}
      >
        <option value="">Select...</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (field?.type === "date") {
    return (
      <input
        type="date"
        value={String(rule.value ?? "")}
        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
        className={`${inputClass} w-full`}
      />
    );
  }

  if (field?.type === "number") {
    return (
      <input
        type="number"
        value={String(rule.value ?? "")}
        onChange={(e) =>
          updateRule(rule.id, {
            value: e.target.value === "" ? "" : Number(e.target.value),
          })
        }
        className={`${inputClass} w-full`}
        placeholder="0"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(rule.value ?? "")}
      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
      className={`${inputClass} w-full`}
      placeholder="value"
    />
  );
}

const DEPTH_COLORS = [
  "var(--depth-0)",
  "var(--depth-1)",
  "var(--depth-2)",
  "var(--depth-3)",
  "var(--depth-4)",
];

export const QueryRuleComponent = memo(function QueryRuleComponent({
  rule,
  fields,
  depth,
  hasError,
}: Props) {
  const { updateRule, removeNode } = useQueryStore(
    useShallow((s) => ({
      updateRule: s.updateRule,
      removeNode: s.removeNode,
    })),
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const field = fields.find((f) => f.key === rule.field);
  const availableOps = field ? OPERATORS_BY_TYPE[field.type] : [];
  const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateRule(rule.id, { field: e.target.value });
    },
    [rule.id, updateRule],
  );

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateRule(rule.id, { operator: e.target.value as Operator });
    },
    [rule.id, updateRule],
  );

  const selectClass = `
    bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-md)]
    text-[var(--text-primary)] text-sm px-3 py-1.5 h-8
    focus:outline-none focus:border-[var(--color-primary)]
    transition-all duration-150 cursor-pointer
  `;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex flex-col md:flex-row items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]
        border transition-all duration-150 group animate-fade-in
        ${
          hasError
            ? "border-[var(--border-danger)] bg-red-950/20"
            : "border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
        }
      `}
    >
      {/* Depth indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[var(--radius-md)]"
        style={{ background: depthColor }}
      />

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        title="Drag to reorder"
        aria-label="Drag handle"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Field selector */}
      <select
        value={rule.field}
        onChange={handleFieldChange}
        className={`${selectClass} w-full lg:w-[110px] flex-shrink-0`}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={rule.operator}
        onChange={handleOperatorChange}
        className={`${selectClass} w-full lg:w-[120px] flex-shrink-0`}
      >
        {availableOps.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Value input */}
      <div className="w-full lg:flex-1 min-w-0">
        <ValueInput rule={rule} field={field} />
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeNode(rule.id)}
        className="
          flex-shrink-0 w-6 h-6 rounded flex items-center justify-center
          text-[var(--text-tertiary)] hover:text-[var(--color-danger)] hover:bg-red-950/30
          opacity-0 group-hover:opacity-100 transition-all duration-150
        "
        title="Remove rule (Del)"
        aria-label="Remove rule"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path
            d="M1 1L11 11M11 1L1 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Error indicator */}
      {hasError && (
        <div className="w-4 h-4 rounded-full bg-[var(--color-danger)] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[9px] font-bold">!</span>
        </div>
      )}
    </div>
  );
});
