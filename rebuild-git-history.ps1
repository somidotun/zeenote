# Rebuild Git History script for 7 Pull Requests
$ErrorActionPreference = "Stop"

$workspace = "c:/Users/SMD/Documents/GitHub/visual-query-builder"
$backupDir = "$workspace/.git-backup-tmp"

Write-Host "Creating backup directory at $backupDir..."
if (Test-Path $backupDir) {
    Remove-Item -Path $backupDir -Recurse -Force
}
New-Item -ItemType Directory -Path $backupDir | Out-Null

# Copy files to backup (excluding node_modules, .next, .git)
Copy-Item -Path "$workspace/app" -Destination "$backupDir/app" -Recurse -Force
Copy-Item -Path "$workspace/public" -Destination "$backupDir/public" -Recurse -Force
Copy-Item -Path "$workspace/__tests__" -Destination "$backupDir/__tests__" -Recurse -Force

$configFiles = @(
    "package.json", "package-lock.json", "tsconfig.json", "eslint.config.mjs",
    "next.config.ts", "postcss.config.mjs", "vitest.config.ts", "vitest.setup.ts",
    ".gitignore", "vercel.json"
)

foreach ($file in $configFiles) {
    if (Test-Path "$workspace/$file") {
        Copy-Item -Path "$workspace/$file" -Destination "$backupDir/$file" -Force
    }
}

Write-Host "Initializing Git Repository..."
if (Test-Path "$workspace/.git") {
    Remove-Item -Path "$workspace/.git" -Recurse -Force
}

# Run git init
git init

# Configure local git user if not set
git config user.name "Zeenote Dev"
git config user.email "dev@zeenote.local"

# Set branch name to main
git checkout -b main

# Create boilerplate base files for initial commit
Remove-Item -Path "$workspace/app" -Recurse -Force
Remove-Item -Path "$workspace/public" -Recurse -Force
Remove-Item -Path "$workspace/__tests__" -Recurse -Force

New-Item -ItemType Directory -Path "$workspace/app" | Out-Null
New-Item -ItemType Directory -Path "$workspace/public" | Out-Null

# Copy base configuration files back from backup
foreach ($file in $configFiles) {
    if (Test-Path "$backupDir/$file") {
        Copy-Item -Path "$backupDir/$file" -Destination "$workspace/$file" -Force
    }
}

# Create base layout.tsx
@'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
'@ | Out-File -FilePath "$workspace/app/layout.tsx" -Encoding utf8

# Create base page.tsx
@'
export default function Home() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Zeenote Query Builder Boilerplate</h1>
      <p>Initial project layout.</p>
    </div>
  );
}
'@ | Out-File -FilePath "$workspace/app/page.tsx" -Encoding utf8

# Create base globals.css
@'
@import "tailwindcss";
'@ | Out-File -FilePath "$workspace/app/globals.css" -Encoding utf8

# Commit boilerplate
git add .
git commit -m "Initial commit: Next.js boilerplate and project configuration"

# --- BRANCH 1: types-and-schemas ---
Write-Host "Creating branch: feature/1-types-and-schemas..."
git checkout -b feature/1-types-and-schemas

New-Item -ItemType Directory -Path "$workspace/app/types" -Force | Out-Null
New-Item -ItemType Directory -Path "$workspace/app/lib" -Force | Out-Null

Copy-Item -Path "$backupDir/app/types/query.ts" -Destination "$workspace/app/types/query.ts" -Force
Copy-Item -Path "$backupDir/app/lib/schemas.ts" -Destination "$workspace/app/lib/schemas.ts" -Force

git add .
git commit -m "feat(core): define query builder types and database schemas"

# --- BRANCH 2: query-engine ---
Write-Host "Creating branch: feature/2-query-engine..."
git checkout -b feature/2-query-engine

Copy-Item -Path "$backupDir/app/lib/queryEngine.ts" -Destination "$workspace/app/lib/queryEngine.ts" -Force
New-Item -ItemType Directory -Path "$workspace/__tests__" -Force | Out-Null
Copy-Item -Path "$backupDir/__tests__/queryEngine.test.ts" -Destination "$workspace/__tests__/queryEngine.test.ts" -Force

git add .
git commit -m "feat(engine): implement AST query evaluation engine and unit tests"

# --- BRANCH 3: query-store ---
Write-Host "Creating branch: feature/3-query-store..."
git checkout -b feature/3-query-store

New-Item -ItemType Directory -Path "$workspace/app/store" -Force | Out-Null
Copy-Item -Path "$backupDir/app/store/queryStore.ts" -Destination "$workspace/app/store/queryStore.ts" -Force
Copy-Item -Path "$backupDir/__tests__/queryStore.test.ts" -Destination "$workspace/__tests__/queryStore.test.ts" -Force

git add .
git commit -m "feat(store): implement Zustand state store with undo/redo and history"

# --- BRANCH 4: layout-and-toolbar ---
Write-Host "Creating branch: feature/4-layout-and-toolbar..."
git checkout -b feature/4-layout-and-toolbar

New-Item -ItemType Directory -Path "$workspace/app/components/query-builder" -Force | Out-Null
Copy-Item -Path "$backupDir/app/components/query-builder/QueryBuilder.tsx" -Destination "$workspace/app/components/query-builder/QueryBuilder.tsx" -Force
Copy-Item -Path "$backupDir/app/components/query-builder/Toolbar.tsx" -Destination "$workspace/app/components/query-builder/Toolbar.tsx" -Force
Copy-Item -Path "$backupDir/app/page.tsx" -Destination "$workspace/app/page.tsx" -Force

git add .
git commit -m "feat(ui): add visual builder layout frame and toolbar actions"

# --- BRANCH 5: builder-components ---
Write-Host "Creating branch: feature/5-builder-components..."
git checkout -b feature/5-builder-components

Copy-Item -Path "$backupDir/app/components/query-builder/QueryGroup.tsx" -Destination "$workspace/app/components/query-builder/QueryGroup.tsx" -Force
Copy-Item -Path "$backupDir/app/components/query-builder/QueryRule.tsx" -Destination "$workspace/app/components/query-builder/QueryRule.tsx" -Force
Copy-Item -Path "$backupDir/__tests__/QueryGroup.test.tsx" -Destination "$workspace/__tests__/QueryGroup.test.tsx" -Force
Copy-Item -Path "$backupDir/__tests__/QueryRule.test.tsx" -Destination "$workspace/__tests__/QueryRule.test.tsx" -Force

git add .
git commit -m "feat(ui): add visual QueryGroup and QueryRule drag-and-drop components"

# --- BRANCH 6: preview-and-results ---
Write-Host "Creating branch: feature/6-preview-and-results..."
git checkout -b feature/6-preview-and-results

Copy-Item -Path "$backupDir/app/components/query-builder/QueryPreview.tsx" -Destination "$workspace/app/components/query-builder/QueryPreview.tsx" -Force
Copy-Item -Path "$backupDir/app/components/query-builder/ResultsPanel.tsx" -Destination "$workspace/app/components/query-builder/ResultsPanel.tsx" -Force

git add .
git commit -m "feat(ui): add live query SQL/Mongo preview and results execution panel"

# --- BRANCH 7: styling-and-font ---
Write-Host "Creating branch: feature/7-styling-and-font..."
git checkout -b feature/7-styling-and-font

Copy-Item -Path "$backupDir/app/globals.css" -Destination "$workspace/app/globals.css" -Force
Copy-Item -Path "$backupDir/app/layout.tsx" -Destination "$workspace/app/layout.tsx" -Force
Copy-Item -Path "$backupDir/public/fonts" -Destination "$workspace/public/fonts" -Recurse -Force

git add .
git commit -m "style: apply Retro Wedding color theme and integrate Aspekta font"

# Clean up backup directory
Remove-Item -Path $backupDir -Recurse -Force

Write-Host "Done! All 7 branches successfully created."
