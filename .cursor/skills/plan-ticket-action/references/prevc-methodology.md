# PREVC Methodology — Complete Reference

The PREVC methodology ensures every planning document is thorough, justified, and actionable.
Each phase has strict entry and exit criteria.

---

## P — Planejamento (Planning Phase)

### Objective
Determine exactly what needs to change in the codebase and how.

### Entry Criteria
- Context is fully gathered (the "Why" is clear)
- Codebase has been analyzed (Step 2 complete)

### Activities

1. **Map the change surface**: List every file that needs modification, creation, or deletion.
   Organize by layer/module:
   - Controllers / Handlers / Routes
   - Services / Use Cases
   - Repositories / Data Access
   - Domain / Entities / Models
   - DTOs / Validators / Schemas
   - Configuration files
   - Tests

2. **Define the change for each file**: For each file, describe:
   - What exists today (current behavior)
   - What needs to change (target behavior)
   - How it changes (approach)

3. **Identify architectural patterns in use**: Look at the existing code and note:
   - Folder structure pattern (layered, modular, feature-based)
   - Naming conventions (files, classes, methods, variables)
   - Dependency injection approach
   - Error handling patterns
   - Logging patterns
   - Response/return patterns

4. **Apply design principles** (in this priority order):
   a. Project-specific standards file (if it exists) — always highest priority
   b. Patterns already established in the codebase — maintain consistency
   c. SOLID principles
   d. Clean Architecture / Hexagonal Architecture boundaries
   e. DDD tactical patterns (if the project uses them)

5. **Assess impact radius**:
   - What modules depend on the changed code?
   - Are there shared interfaces or contracts that change?
   - Could this break existing tests?
   - Are there database migrations needed?
   - Are there environment variables or config changes?

### Exit Criteria
- Every file to be touched is listed with a clear description of the change
- Architectural patterns are identified and respected
- Impact radius is documented

---

## R — Revisão (Review Phase)

### Objective
Validate that every planned change is correct, consistent, and justified by the actual codebase.

### Entry Criteria
- Planning Phase is complete

### Activities

1. **Cross-reference each change with the codebase**: For every modification planned in Phase P,
   the LLM must:
   - Read the actual file that will be changed
   - Confirm the current state matches what was described in Phase P
   - Verify the planned change is compatible with the existing code
   - Cite specific code snippets as evidence

2. **Consistency check**:
   - Do all planned changes follow the same patterns found in the project?
   - Are naming conventions consistent with existing code?
   - Are imports/dependencies correctly identified?
   - Does the planned data flow make sense end-to-end?

3. **Completeness check**:
   - Does the plan cover all layers affected by the change?
   - Are edge cases considered?
   - Are error scenarios handled?
   - Is the test strategy complete?

4. **Conflict check**:
   - Does any planned change contradict another planned change?
   - Are there circular dependencies being introduced?
   - Does this break any existing contract/interface?

### Justification Requirement

For every planned file change, provide a justification block like this:

```
**Justification for [file path]:**
- Current state: [what exists, with code reference]
- Planned change: [what will change]
- Why this is valid: [reasoning based on actual code]
- Evidence: [relevant code snippet or structural reference]
```

If you CANNOT justify a change, remove it from the plan and re-evaluate.

### Exit Criteria
- Every change has a written justification with code evidence
- No unjustified changes remain
- Consistency, completeness, and conflict checks pass

---

## E — Execução (Execution Phase)

### Objective
Write the final planning markdown document.

### Entry Criteria
- Review Phase passed with all changes justified

### Activities

1. Use the template from `references/plan-template.md`
2. Fill every mandatory section
3. Include the justified changes from Phase R
4. Write clear, actionable TO-DOs
5. Define test strategy (unit + API/integration)
6. Document trade-offs explicitly

### Writing Guidelines

- Use clear, direct language. Another developer should understand without asking questions.
- Code snippets in the plan should be illustrative (pseudocode or partial), not complete
  implementations — this is a plan, not a PR.
- Use consistent markdown formatting: headers, code blocks, checklists.
- Keep sections focused — no rambling.

### Exit Criteria
- All mandatory template sections are filled
- Document reads coherently from top to bottom
- A developer unfamiliar with the task could follow it

---

## V — Validação (Validation Phase)

### Objective
Ensure the markdown document meets all quality standards.

### Entry Criteria
- Execution Phase produced a complete document

### Activities

Run every item in `references/validation-checklist.md`. The document must pass ALL items.

If any item fails:
1. Note which item failed
2. Return to Phase E
3. Fix the issue
4. Re-run validation

### Exit Criteria
- All checklist items pass
- Document is ready for delivery

---

## C — Conclusão (Conclusion Phase)

### Objective
Finalize and deliver the document.

### Activities

1. Save the file to the determined output directory
2. Present the file to the user
3. Say: "Arquivo finalizado."

### Rules
- Do NOT summarize what was done
- Do NOT explain the methodology
- Do NOT ask for feedback (unless there were unresolved questions)
- Just deliver and close
