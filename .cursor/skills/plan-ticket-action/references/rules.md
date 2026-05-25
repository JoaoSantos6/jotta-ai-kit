# Global Rules

These rules apply across all phases and steps of the plan-ticket-action skill.

---

## Hard Constraints

1. **No code execution.** This skill produces markdown documents only. Never run code,
   docker commands, git operations, database queries, or any executable action.

2. **No code writing.** The plan document may contain illustrative pseudocode or small
   snippets to clarify intent, but never complete implementations. If a snippet exceeds
   ~15 lines, it's too much — summarize the approach instead.

3. **Always justify with evidence.** Every planned change must reference the actual
   codebase. "It's a best practice" is not a justification by itself — it must be
   accompanied by how it fits the current project context.

4. **Respect existing patterns.** Even if the existing pattern isn't ideal, consistency
   with the project is more important than theoretical perfection. Document the trade-off
   if you notice the existing pattern is suboptimal.

5. **One file output.** Each planning session produces exactly one markdown file.
   Don't split plans into multiple files.

6. **Ask before assuming.** If the user's request is ambiguous, ask. A wrong assumption
   wastes more tokens than a clarifying question.

## Language Rules

- Write the plan document in the same language the user is using in the conversation.
  If they speak Portuguese, write in Portuguese. If English, write in English.
- Technical terms (class names, method names, file paths, design pattern names) stay
  in their original language/convention regardless of the document language.
- The file name (slug) follows the project's primary language. If the codebase is in
  English, use English slugs. If ambiguous, default to English.

## Architecture Principles (Fallback Order)

When the project has no explicit coding standards, apply these in order of priority:

1. **Consistency with existing code** — always the top priority
2. **SOLID principles** — Single Responsibility, Open/Closed, Liskov Substitution,
   Interface Segregation, Dependency Inversion
3. **Clean Architecture** — dependency rule (outer layers depend on inner layers, never reverse)
4. **DDD tactical patterns** — when the project uses domain-driven patterns (entities,
   value objects, aggregates, repositories, domain services)
5. **KISS** — Keep It Simple. Don't over-engineer the plan.

## Interaction Style

- Be direct. Avoid filler phrases, unnecessary explanations of the methodology,
  or meta-commentary about what you're doing.
- When asking questions, batch them in a single message. Don't ask one question,
  wait for an answer, then ask another.
- After delivering the file, say "Arquivo finalizado." and stop. No summaries,
  no "let me know if you need anything else."

## Edge Cases

- **User provides a complete spec:** Skip the question phase, go straight to
  codebase analysis and PREVC.
- **User provides only a ticket ID:** Ask what the ticket is about (the ID alone
  is not enough context).
- **Project has no tests:** Still plan tests in the document — the plan should
  describe what tests to write, even if the project currently has none.
- **Multiple services/repos:** Ask which repository to focus on. Plan one repo
  at a time.
- **User asks to also implement:** Remind them this skill is for planning only.
  Suggest they use the plan document to guide implementation separately.
