# PropOS deployment (Phase 8.2)

## Target topology — AWS ECS Fargate (ap-south-1)

Chosen over Kubernetes for simpler enterprise ops with the same isolation story: managed Postgres (Multi-AZ + PITR), ElastiCache Redis, S3 + CloudFront for documents, Secrets Manager, ALB + WAF, CloudWatch logs, ECS autoscaling.

```
Internet → ALB (+ WAF) → ECS Fargate (web:3000, api:3001)
                              ↓
                    private subnets (dual AZ)
                              ↓
              RDS Postgres 16  │  ElastiCache Redis 7
                              ↓
                    S3 docs ← CloudFront (+ WAF us-east-1)
Secrets Manager → task env (JWT, DB URL, PII key, …)
```

IaC root: `infrastructure/terraform/`. Separate remote state per env via `environments/{dev,staging,prod}.backend.hcl`.

## Prerequisites

1. AWS account + IAM user/role with least privilege to create VPC/ECS/RDS/ElastiCache/S3/WAF/Secrets.
2. S3 bucket + DynamoDB table for Terraform state (fill `CHANGE_ME` in backend hcl).
3. Container images pushed to a registry (GHCR/ECR) — see Phase 8.3 CD.

## Plan / apply

```bash
cd infrastructure/terraform
terraform init -backend-config=environments/staging.backend.hcl
terraform plan -var-file=environments/staging.tfvars -out=tfplan
terraform apply tfplan
```

`terraform plan` should be clean once AWS credentials and backend exist. Terraform CLI was not available on the authoring agent — validate locally:

```bash
terraform init -backend=false
terraform validate
terraform plan -var-file=environments/staging.tfvars
```

**Skipped on agent:** live `terraform plan` against AWS (no credentials/CLI).
## Zero-downtime deploys

- ECS services use `deployment_minimum_healthy_percent = 100`, `maximum_percent = 200` (rolling).
- Circuit breaker + automatic rollback on unhealthy deploy.
- **Migrations run as a gated ECS RunTask** (`propos-{env}-migrate` task definition) **before** updating the API service — never at app boot.
- CD workflow (Phase 8.3) wires: migrate → update service → wait stable → smoke.

### Rollback

1. Redeploy previous image tag: `aws ecs update-service --force-new-deployment` with prior task definition revision, **or** re-run CD with previous release tag.
2. If migration was additive only, leave DB as-is. Destructive migrations require restore from RDS PITR snapshot (see `docs/DR_RUNBOOK.md`).
3. Circuit breaker rolls back ECS task definition automatically on health-check failure.

## Environments

| Env | State key | Multi-AZ RDS | Redis HA | API min tasks |
|-----|-----------|--------------|----------|---------------|
| dev | `dev/` | no | no | 1–2 |
| staging | `staging/` | no | no | 2 |
| prod | `prod/` | yes | yes | 3+ |

IAM: execution role (pull images + secrets) and task role (S3 only) are least-privilege and env-scoped by name prefix.

## Operator checklist after first apply

- [ ] Rotate Secrets Manager values away from Terraform-generated bootstrap if required by policy
- [ ] Attach ACM certificate + HTTPS listener (extend `ecs.tf` listener)
- [ ] Point DNS at ALB
- [ ] Confirm `DATA_RESIDENCY_REGION=ap-south-1`
- [ ] Run migrate task once: `aws ecs run-task --task-definition propos-staging-migrate ...`
