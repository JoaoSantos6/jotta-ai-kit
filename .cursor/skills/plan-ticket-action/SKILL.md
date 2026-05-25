---
name: plan-ticket-action
description: >
  Create structured planning documents (markdown) for backend code changes, modifications, or new features.
  Use this skill whenever the user asks to plan, document, or spec out a code change, ticket, task, feature,
  refactoring, migration, or any backend modification — even if they don't say "plan" explicitly. Trigger on
  phrases like "planejar alteração", "criar planejamento", "plan this ticket", "spec out this change",
  "document this task", "como implementar", "preciso alterar", "quero modificar", or any request that implies
  thinking through a backend change before coding it. This skill produces ONLY markdown planning documents —
  it never writes code, runs docker, or touches git. If the user wants actual code execution, inform them
  this skill is for planning only.
---

# Plan Ticket Action

Create rigorous, reviewable planning documents for backend code changes using the PREVC methodology.

## Important Constraints

- Output is ALWAYS a markdown file. Never execute code, docker commands, or git operations.
- The planning document must be self-contained: another developer should be able to read it and understand
  exactly what to do, why, and how to validate.
- All planning decisions must be justified with references to the actual codebase.

---

## Step 0 — Detect Output Location

Before anything else, determine where to save the plan file. Check in this order:

```
1. docs/plans/       — if docs/ directory exists
2. .cursor/plans/    — if .cursor/ directory exists
3. .claude/plans/    — if .claude/ directory exists
4. plans/            — fallback: create this directory
```

Use `view` on the project root to detect the structure. Pick the first match.

## Step 1 — Gather Context (the "Why")

Every plan needs a clear motivation. Before analyzing code, ensure you understand:

1. **What** is being changed?
2. **Why** is it being changed? (business reason, bug fix, tech debt, new feature)
3. **Who** requested it? (ticket ID, stakeholder, or user initiative)
4. **What is the expected outcome?**

If ANY of these are vague or missing, ask the user. Do not proceed until you have a clear "why."
Use `ask_user_input_v0` for structured questions when appropriate, or ask in prose for open-ended
clarifications. Limit to one round of questions if possible — batch related questions together.

Store all gathered context mentally to feed into the PREVC pipeline.

## Step 2 — Analyze the Codebase

Read `references/codebase-analysis.md` for the full strategy.

**Summary of the approach:**

1. Check for structural docs first: `AGENTS.md`, `INDEX.md`, `README.md`, `ARCHITECTURE.md`,
   `docs/`, or any project map file. If found, use them as the primary navigation guide.
2. If no structural docs exist, do a shallow scan: `view` the project root, then key directories
   (src/, app/, lib/, domain/, modules/, etc.) — never deeper than 2 levels initially.
3. Only deep-dive into files directly related to the planned change.
4. Check for project-specific coding standards files: `.editorconfig`, `eslint`, `prettier`,
   `CONTRIBUTING.md`, `CODING_STANDARDS.md`, `styleguide`, or similar. If found, respect them.

## Step 3 — Execute PREVC Methodology

Read `references/prevc-methodology.md` for the complete PREVC rules.

Execute each phase in strict order:

### P — Planejamento (Planning)

Determine exactly which files need to change and how. Think about:
- Architecture patterns already in use (respect them)
- SOLID, Clean Architecture, DDD principles (when no project-specific guide exists)
- Impact radius: what other files/modules might be affected
- New files that need to be created
- Dependencies that might be introduced or removed

### R — Revisão (Review)

Self-review the plan from Phase P. For EVERY planned change, provide justification by referencing
actual code from the project. Read `references/prevc-methodology.md` § Review Phase for the
validation checklist. If any change cannot be justified, revise Phase P before continuing.

### E — Execução (Execution)

Write the markdown document. Follow the template in `references/plan-template.md`.
The document structure must include all mandatory sections from the template.

### V — Validação (Validation)

Run the validation checklist from `references/validation-checklist.md` against the generated
markdown. Every item must pass. If any item fails, go back to Phase E and fix it.

### C — Conclusão (Conclusion)

Save the file and say: "Arquivo finalizado." — nothing more.

## Step 4 — Name and Save the File

Read `references/naming-convention.md` for naming rules.

**Quick reference:**
- Pattern: `plan-<descriptive-slug>.md`
- If ticket ID provided: `plan-<ticket-id>.md` or `plan-<ticket-id>-<short-description>.md`
- Examples: `plan-add-user-auth.md`, `plan-PROJ-1234.md`, `plan-PROJ-1234-refactor-payments.md`

Save to the directory determined in Step 0. Use `create_file` to write the final document.
Then use `present_files` to deliver it to the user.

---

## Reference Files

| File | When to read | Purpose |
|------|-------------|---------|
| `references/prevc-methodology.md` | Step 3 | Full PREVC phase rules and validation criteria |
| `references/plan-template.md` | Step 3, Phase E | Markdown template for the plan document |
| `references/validation-checklist.md` | Step 3, Phase V | Mandatory checklist items |
| `references/codebase-analysis.md` | Step 2 | Token-efficient codebase reading strategies |
| `references/naming-convention.md` | Step 4 | File naming rules and examples |
| `references/rules.md` | Always | Global rules and constraints |
