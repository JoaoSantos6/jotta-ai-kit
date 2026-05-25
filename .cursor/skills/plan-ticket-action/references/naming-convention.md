# Naming Convention

Rules for naming planning document files.

---

## Pattern

```
plan-<slug>.md
```

Where `<slug>` is a kebab-case identifier derived from the change being planned.

## Rules

1. Always starts with `plan-`
2. Always ends with `.md`
3. Slug uses kebab-case (lowercase, hyphens between words)
4. Slug should be descriptive but concise (2-6 words)
5. No special characters, accents, or spaces in the slug
6. If a ticket ID is provided, prefer using it

## Construction Priority

| Scenario | Pattern | Example |
|----------|---------|---------|
| Ticket ID provided | `plan-<TICKET-ID>.md` | `plan-PROJ-1234.md` |
| Ticket ID + description | `plan-<TICKET-ID>-<short-desc>.md` | `plan-PROJ-1234-add-user-auth.md` |
| Description only | `plan-<short-desc>.md` | `plan-add-user-auth.md` |
| Vague request | Derive from the change context | `plan-refactor-payment-service.md` |

## Slug Derivation

When creating a slug from a description:

1. Extract the main action verb and target: "Adicionar autenticação JWT" → `add-jwt-auth`
2. Remove filler words (o, a, de, do, da, no, na, the, in, for, to)
3. Translate to English if the project is English-based, keep in Portuguese if the project is Portuguese-based
4. Keep it under 6 words

## Examples

| User says | File name |
|-----------|-----------|
| "Preciso planejar o ticket BACK-442" | `plan-BACK-442.md` |
| "Ticket BACK-442: adicionar cache Redis no serviço de produtos" | `plan-BACK-442-add-redis-cache-products.md` |
| "Quero refatorar o módulo de pagamentos para suportar PIX" | `plan-refactor-payments-pix-support.md` |
| "Fix the race condition in webhook processing" | `plan-fix-webhook-race-condition.md` |
| "Migrar de REST para GraphQL no módulo de pedidos" | `plan-migrate-orders-rest-to-graphql.md` |

## Output Directory

Determined in Step 0 of the SKILL.md. The file is always placed inside a `plans/` directory
within the project's documentation or tooling folder.
