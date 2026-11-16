**What changed and why**

**How I tested it**

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` pass locally
- [ ] New route handlers call `requireUser()` first; new tables have RLS and the members-only policy (see [CLAUDE.md](../CLAUDE.md))
- [ ] README updated if behaviour changed
