# PropOS go-live checklist (Phase 11.1)

Owner column: Eng / Ops / Security / Legal / Founder.

## Security

- [ ] Secrets rotated for prod JWT / refresh / storage / PII / Razorpay / SCIM — **Ops** — `aws secretsmanager …` / vault
- [ ] No placeholder secrets in prod boot — **Eng** — `assertProductionSecretsConfigured` fails closed
- [ ] WAF attached to ALB + CloudFront — **Ops** — `terraform state show aws_wafv2_web_acl.alb`
- [ ] Rate limits on (global + auth + tenant RPM) — **Eng** — hit `/auth/login` ×11 → 429
- [ ] Dependency audit green / triaged — **Eng** — `pnpm audit --audit-level=high`
- [ ] Container Trivy gate green — **Eng** — CI `container-scan`
- [ ] Pen-test findings triaged — **Security** — ticket board

## Data

- [ ] Migrations applied — **Ops** — `pnpm --filter @propos/backend exec prisma migrate deploy`
- [ ] Backups + PITR verified by restore — **Ops** — `./scripts/verify-restore.sh …` + RDS snapshot restore drill
- [ ] DR runbook tested — **Ops** — `docs/DR_RUNBOOK.md`

## Reliability

- [ ] `/health/live` + `/health/ready` live — **Eng** — `curl $API/api/v1/health/ready`
- [ ] Graceful shutdown verified — **Eng** — SIGTERM drains; ECS deregistration delay 30s
- [ ] Autoscaling tested — **Ops** — CPU load → desired count increases
- [ ] Load test meets SLOs — **Eng** — `docs/LOAD_TEST.md` k6 scripts
- [ ] Alerting + on-call wired — **Ops** — Sentry/Prometheus → pager

## Tenancy

- [ ] Isolation suite green — **Eng** — `pnpm --filter @propos/backend exec jest --testPathPattern=tenant`
- [ ] Per-tenant limits on — **Eng** — `docs/TENANT_LIMITS.md` + noisy-neighbor k6

## Payments / compliance

- [ ] Razorpay live mode + reconciliation — **Eng** — `docs` Phase 5.1
- [ ] GST e-invoice live / IRP configured — **Eng** — `docs/GST_EINVOICING.md`
- [ ] RERA rules on — **Eng** — `docs/RERA_AGREEMENTS_ESIGN.md`
- [ ] DPDP rights endpoints working — **Eng** — `GET/DELETE /privacy/*`
- [ ] Consent capture on — **Eng** — `docs/DPDP_COMPLIANCE.md`

## Observability

- [ ] Dashboards for latency/error/queue/DB — **Ops** — `docs/OBSERVABILITY.md`
- [ ] Log retention set — **Ops** — CloudWatch 90d prod

## Legal / ops

- [ ] ToS + privacy policy published — **Legal**
- [ ] DPA template ready — **Legal**
- [ ] Status page URL — **Ops**
- [ ] Support workflow + SLAs — **Ops / Founder**

## Rollback

- [ ] Rollback procedure documented — **Ops** — `docs/DEPLOYMENT.md`
- [ ] Rollback rehearsed (prior image tag) — **Ops** — staging drill

## Enterprise (Phase 9)

- [ ] SSO IdP configured for pilot tenant — **Eng**
- [ ] Platform admin allowlist set — **Ops** — `PLATFORM_ADMIN_EMAILS`
- [ ] API keys + webhook secrets rotated — **Eng**
