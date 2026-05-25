# Validation Checklist

Run every item below against the generated planning document.
ALL items must pass for the document to be considered complete.
If any item fails, return to Phase E (Execution) and fix it before delivering.

---

## Mandatory Content Checks

- [ ] **Problem Context exists and is clear**
  The document has a "Contexto do Problema" section that explains what exists today,
  why it needs to change, and the expected outcome. A reader unfamiliar with the project
  should understand the motivation.

- [ ] **Trade-offs are documented**
  At least one trade-off table entry exists. Each entry has: the decision taken,
  an alternative that was considered, why this approach was chosen, and associated risks.
  "No trade-offs" is almost never true — if the plan says this, reconsider.

- [ ] **TO-DOs are structured by module/layer**
  Changes are grouped logically (by domain, layer, or module — not as a flat list).
  Each TO-DO item identifies the file, describes the change, and includes a justification.

- [ ] **Every change has a justification with code reference**
  No planned change exists without an explanation of why it is needed and evidence
  from the actual codebase. "Because it's best practice" alone is insufficient —
  it must reference the current project state.

- [ ] **Unit tests are planned**
  A test table exists with at least: the scenario being tested, the test file location
  (or proposed location), and what the test validates. Cover both success and error cases.

- [ ] **API testing instructions exist**
  At least one curl command (or equivalent) shows how to test the change via API.
  It includes: method, URL, headers, body, expected success response, and expected
  error response.

## Structural Checks

- [ ] **Title is descriptive and specific**
  The document title follows the pattern "Plan: [descriptive action]".
  It should be clear what the plan is about from the title alone.

- [ ] **Metadata header is present**
  The document has: ticket ID (or N/A), date, author, and status.

- [ ] **Affected components table is complete**
  A table lists every file/module being changed with the layer and type of change.

- [ ] **Project patterns are documented**
  The plan identifies architectural patterns, naming conventions, and coding standards
  found in the project, showing that the planned changes respect them.

## Quality Checks

- [ ] **Self-contained readability**
  A developer who was NOT part of this planning session could read the document
  and understand what to do. No implicit knowledge is required.

- [ ] **No implementation code**
  The document contains illustrative snippets or pseudocode at most — not full
  implementations. This is a plan, not a pull request.

- [ ] **Impact on other modules is assessed**
  The document considers whether the change affects other parts of the system
  and documents this explicitly (even if the answer is "no impact").

- [ ] **Consistent formatting**
  Markdown is well-formed: headers are hierarchical, code blocks have language tags,
  checklists use `- [ ]` syntax, tables are aligned.

---

## How to Handle Failures

If a check fails:

1. Identify which Phase (P, R, E) introduced the gap
2. Go back to that phase
3. Fix the issue
4. Re-run validation from the top

Common failure patterns:

| Failure | Likely cause | Fix |
|---------|-------------|-----|
| No trade-offs | Skipped analysis of alternatives | Return to Phase P, consider at least one alternative approach |
| Vague justifications | Didn't read the actual code | Return to Phase R, read the file and cite evidence |
| Missing test scenarios | Only covered happy path | Add error/edge case scenarios |
| No API test examples | Forgot to determine endpoints | Check routes/controllers for the endpoint path |
| Flat TO-DO list | Didn't organize by layer | Group by module/layer as seen in the project structure |
