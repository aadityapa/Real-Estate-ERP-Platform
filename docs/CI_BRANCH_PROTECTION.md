# CI branch protection (Phase 1.4)

Require these status checks before merging to `main`:

| Check | Required |
|-------|----------|
| Lint & build | Yes |
| Backend tests | Yes |
| Frontend unit tests | Yes |
| Prisma migration check | Yes |
| Dependency audit (warn) | No (`continue-on-error`) |
| Playwright e2e | No until docker stack is green (`continue-on-error`) |

GitHub → Settings → Branches → Branch protection rule for `main` →
Require status checks to pass before merging → select the **Yes** jobs above.

## Local verify (1.3)

```bash
pnpm --filter @propos/frontend test
pnpm test:e2e   # needs docker compose stack on :3000 / :3001
```

```bash
docker compose -f infrastructure/docker/docker-compose.full.yml up -d --build
# migrate + seed API image, then:
pnpm exec playwright install chromium
pnpm test:e2e
```
