import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryGroupComponent } from '../app/components/query-builder/QueryGroup';
import { useQueryStore } from '../app/store/queryStore';
import { SCHEMAS } from '../app/lib/schemas';
import type { QueryGroup } from '../app/types/query';
import React from 'react';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe('QueryGroupComponent', () => {
  const fields = SCHEMAS[0].fields;
  let group: QueryGroup;

  beforeEach(() => {
    group = {
      id: 'test-group-1',
      type: 'group',
      logic: 'AND',
      children: [],
      collapsed: false,
    };
  });

  it('renders correctly as root', () => {
    render(<QueryGroupComponent group={group} fields={fields} isRoot={true} />);
    
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText('AND')).toBeInTheDocument();
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('calls addRule when add rule button is clicked', () => {
    const addRuleMock = vi.fn();
    useQueryStore.setState({ addRule: addRuleMock });

    render(<QueryGroupComponent group={group} fields={fields} />);
    
    const addRuleBtn = screen.getByTitle('Add rule (A)');
    fireEvent.click(addRuleBtn);
    
    expect(addRuleMock).toHaveBeenCalledWith('test-group-1');
  });

  it('calls updateGroupLogic when logic toggle is clicked', () => {
    const updateGroupLogicMock = vi.fn();
    useQueryStore.setState({ updateGroupLogic: updateGroupLogicMock });

    render(<QueryGroupComponent group={group} fields={fields} />);
    
    const orBtn = screen.getByText('OR');
    fireEvent.click(orBtn);
    
    expect(updateGroupLogicMock).toHaveBeenCalledWith('test-group-1', 'OR');
  });

  it('displays validation errors', () => {
    const errors = [{ nodeId: 'test-group-1', message: 'Group must have at least one condition' }];
    render(<QueryGroupComponent group={group} fields={fields} validationErrors={errors} />);
    
    expect(screen.getByText('⚠ Group must have at least one condition')).toBeInTheDocument();
  });
});
