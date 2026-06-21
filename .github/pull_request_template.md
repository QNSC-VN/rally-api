## Linked ticket
<!-- Required: paste the Rally ticket URL or ID -->
Closes #<!-- RALLY-XXX -->

## What changed and why
<!-- 2-5 sentences. What does this PR do? Why is this the right approach? -->

## Type of change
- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no behaviour change
- [ ] `perf` — performance improvement
- [ ] `security` — security fix or hardening
- [ ] `chore` / `ci` / `deps` — tooling, config, deps

## How to test
<!-- Steps for the reviewer to verify this works -->
1. 
2. 

## Security checklist
<!-- For auth, data access, or API changes — skip if not applicable -->
- [ ] No secrets logged or exposed in error messages
- [ ] Input validated at the boundary (Zod / class-validator)
- [ ] New endpoints have auth guard + permission check
- [ ] No cross-tenant data access possible (RLS verified)
- [ ] Migration is zero-downtime (expand-contract pattern)

## Reviewer notes
<!-- Anything the reviewer should pay special attention to -->
