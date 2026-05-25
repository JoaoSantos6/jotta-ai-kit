# Codebase Analysis Strategy

How to analyze a project's codebase efficiently while minimizing token consumption.

---

## Priority 1: Look for Structural Documentation

Before reading any source code, check if the project has navigation aids.
These files are cheap to read and save thousands of tokens by telling you where things are.

**Check for these files (in order):**

```
AGENTS.md          — AI-oriented project map (increasingly common)
INDEX.md           — Project index or table of contents
ARCHITECTURE.md    — Architecture documentation
README.md          — Often has project structure section
CONTRIBUTING.md    — May describe code organization and standards
docs/              — Documentation directory (scan for structure docs)
.cursor/rules      — Cursor AI rules (often describe project patterns)
.claude/           — Claude-specific project documentation
```

**How to use them:**
- Read the structural doc first
- Use it as a map to navigate directly to relevant files
- Do NOT re-scan directories that the doc already describes

---

## Priority 2: Shallow Scan (when no structural docs exist)

If no navigation aids exist, do a controlled scan.

### Step 1 — Project root (1 `view` call)

```
view /path/to/project
```

This shows the top-level structure. From here, identify:
- The main source directory (src/, app/, lib/, server/)
- Config files (package.json, pyproject.toml, go.mod, pom.xml, Cargo.toml)
- Test directory location

### Step 2 — Source directory (1 `view` call)

```
view /path/to/project/src
```

From the source listing, identify the architectural pattern:
- **Layered**: controllers/, services/, repositories/, models/
- **Modular/Feature-based**: users/, payments/, orders/ (each with their own layers)
- **Hexagonal**: domain/, application/, infrastructure/, ports/
- **Simple**: flat file structure

### Step 3 — Targeted reads (only files relevant to the change)

Now you know the structure. Only read files directly related to the planned change.

**Token-saving tactics:**

1. **Read config/package files first** — they reveal the tech stack, dependencies,
   and framework in use, which tells you what patterns to expect without reading code.

2. **Use `view` with line ranges** — if you only need to see a specific function or class,
   use `view_range` to read just those lines instead of the entire file.

3. **Read one representative file per layer** — if you need to understand the pattern
   used in controllers, read ONE controller. Don't read all of them.

4. **Prefer interface/type files over implementations** — type definitions, interfaces,
   and DTOs tell you the contract without the implementation noise.

5. **Read test files to understand expected behavior** — a test file often reveals
   the API contract, expected inputs/outputs, and edge cases faster than reading
   the implementation.

6. **Skip generated files** — migrations, lock files, compiled output, and auto-generated
   code waste tokens and provide little insight.

---

## Priority 3: Identify Coding Standards

After understanding the structure, look for explicit coding standards:

```
.editorconfig           — Formatting rules
.eslintrc / .eslintrc.js — Linting rules (JS/TS)
.prettierrc             — Formatting config (JS/TS)
pylintrc / .flake8      — Linting rules (Python)
rubocop.yml             — Linting rules (Ruby)
CODING_STANDARDS.md     — Explicit standards doc
styleguide/             — Style guide directory
```

If none exist, infer standards from the existing code:
- Indentation style (tabs vs spaces, 2 vs 4)
- Naming convention (camelCase, snake_case, PascalCase)
- Import organization
- Error handling pattern
- Comment style

---

## Anti-Patterns (What NOT to Do)

- **Don't `cat` large files** — use `view` with targeted ranges
- **Don't read every file in a directory** — read one representative file, then only
  read others when needed for the specific change
- **Don't read node_modules, vendor, .git, dist, build** — these are never useful
- **Don't recursively list deep directory trees** — stay at 2 levels max unless needed
- **Don't read the same file twice** — note what you've already read
- **Don't read files unrelated to the change** — if the change is in the payments module,
  don't read the notifications module unless there's a clear dependency

---

## Decision Flowchart

```
Has structural docs? ──YES──> Read them → Go to relevant files only
        │
        NO
        │
        v
View project root → View src/ directory → Identify architecture pattern
        │
        v
Read config (package.json etc.) → Understand tech stack
        │
        v
Read ONE representative file per layer involved in the change
        │
        v
Read ONLY the specific files that need modification
```
