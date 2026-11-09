# Publish runbook — mcp-japan-places

Staged release: **2.1.0** (prepared 2026-11-09, JP-16 canon resync).
Publishing is Dev's step (Dev's statement 2026-11-09 15:44 JST — he runs only
this step himself, same pattern as the 2.0.0 publish). Nothing in this repo is
published until he runs the command below.

## What 2.1.0 contains

- Tool set = the hosted MCP canon exactly: **16 tools** (the site's
  `functions/mcp-tools.json`), including the two newest paid tools
  `jp_grant_deadline_alert` ($0.04) and `jp_gbizinfo_search` ($0.03).
- Removed for canon parity: `jp_health`, `jp_catalog`, `jp_history_diff`
  (the endpoints remain available over REST).
- Generated from the live OpenAPI spec: 20 paths, catalog hash
  `dfd86f59fbe1879c` (see SYNC.json).
- MCP annotation hints on every tool (readOnlyHint true, destructiveHint
  false, idempotentHint true, openWorldHint true) — the M8ven follow-up,
  folded into this release.
- Local verification at staging: `node test/smoke.mjs` bad=0 against the
  live API; tools/list == hosted canon (names and order); drift checker
  exit 0 (`IN SYNC catalog_hash=dfd86f59fbe1879c paths=20`).

## Dev's one command

From this directory (`~/workspace/japan-places-mcp-server`):

```
npm publish --access public
```

Equivalent, publishing the exact staged tarball
(`dist/mcp-japan-places-2.1.0.tgz`, sha256
`7390a5ffdf332ace953f0d789e3a5f5253c681f75f7dc4d5ddbec879ab2de8a1`):

```
npm publish dist/mcp-japan-places-2.1.0.tgz --access public
```

Notes:

- The package is unscoped and already public (2.0.0 is the current published
  version), so `--access public` is belt-and-braces; publish succeeds
  without it too.
- **Auth**: this VM is NOT logged in to npm (`npm whoami` → ENEEDAUTH,
  verified 2026-11-09). Publish from wherever Dev published 2.0.0, or run
  `npm login` first on the machine used. An npm account with publish rights
  to `mcp-japan-places` plus any OTP prompt are the only inputs needed.
- No build step before publish: `src/index.js` and `SYNC.json` in the tree
  are already the generated 2.1.0 artifacts; `npm pack --dry-run` shows
  exactly 5 files (LICENSE, README.md, SYNC.json, package.json,
  src/index.js).
