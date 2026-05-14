# Resyncing this fork

`main` mirrors upstream `Dokploy/cli` exactly. `installable` = `main` + one fork-only commit that adds a `prepare` script so the package builds when installed via `github:Quidge/cli#installable`.

## When upstream advances

```bash
git fetch upstream
git checkout main && git rebase upstream/main
git push origin main

git checkout installable && git rebase main
git push --force-with-lease origin installable
```

Then in any consumer (e.g. `homeworld`):

```bash
rm -rf node_modules package-lock.json
npm install
```

npm re-resolves `github:Quidge/cli#installable` to the new SHA and rebuilds via `prepare`.

## Sanity check after resync

```bash
# In this repo:
pnpm install && pnpm test                          # 22/22 should pass

# In the consumer:
npx dokploy application one --applicationId <id> --json   # returns a record, not HTTP 400
```

## Why the prepare script

`tsc` writes `dist/index.js` as 644; npm doesn't auto-set the executable bit on git-installed bins. The `chmod +x` in `prepare` fixes that. The script also bypasses the upstream `prebuild` hook, which calls `pnpm run generate` and fails when `pnpm` isn't on PATH (typical npm-install context).
