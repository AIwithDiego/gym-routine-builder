# Contributing

Thanks for taking a look. This is a case study and a personal app, so the bar for new features is high, but bug reports and security fixes are welcome.

- **Bugs and ideas:** open an issue with the template. A reproduction helps most.
- **Pull requests:** small and focused. Say what changed and why, and how you tested it.
- **Before opening one:** run `npm run lint && npx tsc --noEmit && npm test && npm run build` and make sure CI is green.
- **Database changes:** every user-owned table needs RLS, owner-only policies and the restrictive members-only policy. The rules are in [CLAUDE.md](CLAUDE.md).
- **Security issues:** never in public. See [SECURITY.md](SECURITY.md).

I answer issues within a few days.
