# CD pipeline & release management (Phase 8.3)

## Flow

```
push main → semver bump → build+push images (GHCR) → Trivy gate
         → destructive-migration gate → migrate RunTask (staging)
         → ECS rolling deploy staging → smoke + e2e
         → GitHub Environment "production" approval
         → tag release + changelog → (optional) promote to prod ECS
```

Workflow: `.github/workflows/cd.yml`

## Required secrets (names only)

| Name | Where | Purpose |
|------|--------|---------|
| `GITHUB_TOKEN` | built-in | Push GHCR packages + create releases |
| `AWS_ROLE_TO_ASSUME` | repo secret | OIDC assume role for ECS deploy |

## Required variables (names only)

| Name | Purpose |
|------|---------|
| `CD_ECS_ENABLED` | `true` to run live ECS steps; otherwise images+gates only |
| `AWS_REGION` | e.g. `ap-south-1` |
| `ECS_CLUSTER_STAGING` / `ECS_CLUSTER_PROD` | Cluster names from Terraform |
| `ECS_SERVICE_API_*` / `ECS_SERVICE_WEB_*` | Service names |
| `ECS_MIGRATE_TASK_STAGING` | Migrate task definition family/ARN |
| `ECS_SUBNETS_STAGING` / `ECS_SG_STAGING` | Network for RunTask |
| `STAGING_BASE_URL` / `STAGING_WEB_URL` | Smoke + Playwright |
| `NEXT_PUBLIC_API_URL_STAGING` / `NEXT_PUBLIC_WS_URL_STAGING` | Web image build-args |

## GitHub Environments

- **staging** — auto on merge to main
- **production** — required reviewers (manual approval before promote)

## Destructive migrations

CD greps migration SQL for `DROP` / `TRUNCATE` / `ALTER … DROP`. If found, deploy blocks unless workflow_dispatch sets `allow_destructive_migration=true`.

## Dummy change → staging

1. Merge any commit to `main`.
2. CD builds images tagged `vX.Y.Z`, `staging`, `sha-…`.
3. Staging environment job runs (or prints placeholder if `CD_ECS_ENABLED` unset).
4. Production job waits for environment approval; live prod update only when `workflow_dispatch` + `promote_prod=true` (or configure branch protection accordingly).
