import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryRuleComponent } from '../app/components/query-builder/QueryRule';
import { useQueryStore } from '../app/store/queryStore';
import { SCHEMAS } from '../app/lib/schemas';
import type { QueryRule } from '../app/types/query';
import React from 'react';

// Mock dnd-kit context
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe('QueryRuleComponent', () => {
  const fields = SCHEMAS[0].fields; // Users schema fields
  let rule: QueryRule;

  beforeEach(() => {
    rule = {
      id: 'test-rule-1',
      type: 'rule',
      field: 'age',
      operator: 'greater_than',
      value: 18,
    };
  });

  it('renders correctly with initial rule', () => {
    render(<QueryRuleComponent rule={rule} fields={fields} depth={0} />);
    
    expect(screen.getByDisplayValue('Age')).toBeInTheDocument();
    expect(screen.getByDisplayValue('greater than')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18')).toBeInTheDocument();
  });

  it('calls updateRule when changing field', () => {
    const updateRuleMock = vi.fn();
    useQueryStore.setState({ updateRule: updateRuleMock });

    render(<QueryRuleComponent rule={rule} fields={fields} depth={0} />);
    
    const select = screen.getByDisplayValue('Age');
    fireEvent.change(select, { target: { value: 'name' } });
    
    expect(updateRuleMock).toHaveBeenCalledWith('test-rule-1', { field: 'name' });
  });

  it('calls removeNode when delete button is clicked', () => {
    const removeNodeMock = vi.fn();
    useQueryStore.setState({ removeNode: removeNodeMock });

    render(<QueryRuleComponent rule={rule} fields={fields} depth={0} />);
    
    const removeBtn = screen.getByTitle('Remove rule (Del)');
    fireEvent.click(removeBtn);
    
    expect(removeNodeMock).toHaveBeenCalledWith('test-rule-1');
  });

  it('renders error state correctly', () => {
    const { container } = render(<QueryRuleComponent rule={rule} fields={fields} depth={0} hasError={true} />);
    
    // Check if error badge is rendered
    expect(screen.getByText('!')).toBeInTheDocument();
    // Check if error class is applied
    expect(container.firstChild).toHaveClass('border-[var(--border-danger)]');
  });
});
