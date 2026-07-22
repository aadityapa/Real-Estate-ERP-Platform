# Repository Structure Assessment & Reorg Plan

## Assessment

The repository is already organized following common, well-understood
monorepo conventions:

- **`apps/`** — deployable applications that aren't the primary web/API pair
  (`apps/mobile` for the Expo app; `apps/api` reserved for a possible future
  standalone API app).
- **`backend/`** — the NestJS API (`@propos/backend`), kept at the top level
  as one of the two primary deployables alongside `frontend/`.
- **`frontend/`** — the Next.js web app (`@propos/frontend`).
- **`packages/`** — shared, non-deployable code (`shared-types`,
  `shared-utils`, `config`) consumed by `backend/`, `frontend/`, and
  `apps/mobile/` via `workspace:*` references.
- **`infrastructure/`** — deployment/local-infra assets (Docker Compose
  files for local, full-stack, and Docker-based development).

This matches the `pnpm-workspace.yaml` globs (`frontend`, `backend`,
`apps/*`, `packages/*`) and the `turbo.json` task graph, and each package has
a correct, distinct `name` field (`@propos/*`) with no naming collisions.
Domain separation inside `backend/src/modules/` (one folder per bounded
context: crm, sales, construction, hr, finance, vendors, procurement,
documents, legal, assets, marketing, channel-partners, lms, support, ai,
customers, notifications, events) is consistent and easy to navigate.

**Conclusion: the top-level layout is sound.** No mass file moves, renames,
or restructuring are recommended — the risk of breaking imports, CI, Docker
build contexts, or Prisma migration paths would outweigh any organizational
benefit.

## Low-risk improvements (this change set)

These are additive-only and carry no risk to existing code or configuration:

1. **`LICENSE`** — added at the repo root (proprietary, Nexovo Tech Services Private Limited) so the project has a
   clear license, which was previously missing.
2. **Documentation index** — added `ARCHITECTURE.md`, `CONTRIBUTING.md`,
   `SECURITY.md`, `CODE_OF_CONDUCT.md` at the root, plus `.github/` templates
   (issue templates, PR template, `CODEOWNERS`) and a CI workflow
   (`.github/workflows/ci.yml`) using the repo's real pnpm/turbo scripts.
   None of this changes application behavior; it only documents and
   codifies existing structure and workflows.
3. **`.editorconfig`** — added at the root to keep indentation/line-ending
   conventions consistent across editors for contributors, matching the
   existing Prettier formatting already used in the repo (`pnpm format`).

## Possible future improvements (not done now — out of scope / higher risk)

Listed for awareness only; none of these are implemented in this change set,
since they involve moving or renaming existing files/directories:

- Decide the actual fate of `apps/api/` (currently empty): either scaffold
  it as a genuine second app, or remove the `apps/api` folder and the
  `apps/*` glob entry if it's not part of the roadmap. This is a judgment
  call for the team, not something to do unilaterally.
- Consider adding per-package `README.md` files (`backend/README.md`,
  `frontend/README.md` — the root README already references these, so they
  may already exist and should be verified rather than assumed missing).
- Consider adding a root `typecheck` script (e.g. `turbo run typecheck`) if
  the team wants a dedicated type-checking gate distinct from `lint`
  (`shared-types`/`shared-utils` currently fold type-checking into their
  `lint` script via `tsc --noEmit`).

None of the above are executed here; they are recommendations only.
