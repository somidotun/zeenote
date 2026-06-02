# Zeenote

A production-grade, highly interactive visual query builder built with Next.js 16 (App Router), TypeScript, Zustand, and `@dnd-kit`.

## Links
- **Live Deployed URL:** (https://zeenote.netlify.app/)
- **Demo Video:** [To be added / Loom link]

## Features

- Recursive condition groups — unlimited nesting with AND/OR logic
- Drag-and-drop reordering via `@dnd-kit/sortable`
- Schema-driven rendering — type-aware inputs, operator filtering
- Live query preview — SQL, MongoDB, and GraphQL
- Query execution simulator — filters 200-record mock dataset
- Keyboard shortcuts — Ctrl+Z/Y undo/redo, Ctrl+Shift+R reset
- Query history, saved queries, export/import JSON
- Validation engine, collapsible groups, dark/light theme
- Comprehensive test coverage via Vitest and React Testing Library

## Quick Start

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm test        # Run Vitest test suite
```

## Architecture Explanation

Zeenote is built around a unidirectional data flow and a modular architecture. The application is divided into:
1. **State Management (`store/`):** A centralized Zustand store that holds the query tree, handles history (undo/redo), and enforces rules.
2. **UI Components (`components/query-builder/`):** Dumb, presentational components (where possible) that recursively render the query tree, coupled with highly interactive elements like drag-and-drop handles.
3. **Query Engine (`lib/queryEngine.ts`):** Pure functional modules for query execution, formatting, and validation, kept completely detached from React.
4. **Schemas (`lib/schemas.ts`):** Pre-defined data schemas to enforce correct types across the UI and query engine.

## Recursive Rendering Strategy

The UI uses standard recursive React component patterns to visualize the tree of conditions:
- **`QueryGroupComponent`** receives a node of `type: 'group'`. It renders its UI (logic toggles, add buttons) and maps over its `children`.
- If a child is a `rule`, it renders **`QueryRuleComponent`**.
- If a child is another `group`, it recursively renders another **`QueryGroupComponent`** while incrementing a `depth` prop.
- The `depth` prop controls visual indentation (using left margins) and color-coding for deeply nested blocks, ensuring the user can visually trace the logic no matter how deep the tree goes.
- Each `QueryGroupComponent` instantiates its own `DndContext` and `SortableContext` for its immediate children, meaning items are dragged and reordered strictly within their own logical group boundary.

## State Management Decisions

We use **Zustand** for state management due to its minimalistic boilerplate, lack of context providers, and easy integration with React components.
- **Tree Normalization vs. Deep Nesting:** The tree is stored in a deep, nested object format (matching the actual recursive rendering logic). While normalization (flattening the tree into an ID-based dictionary) is often preferred, keeping the tree deeply nested simplifies the generation of SQL/Mongo/GraphQL queries and perfectly aligns with the UI hierarchy. 
- **Immutable Updates:** Operations like `updateNodeById` or `removeNode` return fresh clones of the tree path, preserving React's shallow comparison checks and preventing unnecessary re-renders.
- **`useShallow` Selector:** State selectors are wrapped in `useShallow` to ensure React only re-renders components if the extracted state shape fundamentally changes, solving infinite rendering loops caused by returning new object references.

## Query Engine Design

The query engine is split into three core responsibilities:
1. **Preview Generation (`generateQueryPreview`):** Uses recursive parsers to convert the tree into SQL strings, MongoDB object queries, or GraphQL queries.
2. **Query Execution (`executeQuery`):** A simulator that filters an array of mocked JSON records. It recursively calls `evaluateGroup` and `evaluateRule` to process `AND`/`OR` conditions exactly as a database engine would.
3. **Validation (`validateQuery`):** Walks the tree before execution, ensuring values exist, ranges are valid (e.g., between dates), and groups aren't empty. It returns an array of node IDs and their respective error messages, which are rendered inline in the UI.

## Performance Optimization Techniques

- **Component Memoization:** Both `QueryRuleComponent` and `QueryGroupComponent` are wrapped in `React.memo()`. Because the tree is updated immutably, branches of the tree that haven't changed retain their referential equality and do not re-render.
- **Derived State (`useMemo`):** Live previews and mock data sorting are expensive, so they are wrapped in `useMemo` hooks.
- **Targeted State Subscriptions:** Store subscriptions use `useShallow` so a component only updates if the specific subset of state it cares about has mutated.
- **Hydration Warning Suppression:** Since `dnd-kit` generates incrementing HTML IDs that mismatch between SSR and client environments, hydration warnings are suppressed on drag contexts rather than forcing expensive two-pass client-only renders.

## Trade-offs Made

1. **Deep State vs. Flattened State:** Storing the tree deeply makes drag-and-drop between completely different nested groups slightly more complex compared to a flattened, normalized map of node IDs. We traded ease-of-drag-across-groups for simplicity in generating recursive backend queries.
2. **Client-side Execution vs. Real Backend:** The query simulator processes everything in-memory. For enormous datasets (e.g., 10M records), this would choke the browser thread. A real implementation would offload execution and pagination to an API layer.
3. **HTML Sanitization in Preview:** Rather than building an entire React-based abstract syntax tree (AST) for syntax highlighting, we use simple regex replacements to inject styling spans (`dangerouslySetInnerHTML`). To trade-off XSS vulnerabilities for simplicity, we escape user input (`<`, `>`, `&`) right before injection.

## Keyboard Shortcuts
- `Ctrl/Cmd + Z` — Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` — Redo
- `Ctrl/Cmd + Shift + R` — Reset query

## Local Development Workflow
Code was developed using standard branch-based Git workflows, adhering to CI checks, modular components, strict linting rules, and multiple feature PRs.
