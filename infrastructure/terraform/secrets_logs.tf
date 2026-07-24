resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://propos:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/propos"
    REDIS_URL    = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
    JWT_SECRET   = random_password.jwt.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh.result
    STORAGE_URL_SECRET = random_password.storage.result
    PII_ENCRYPTION_KEY = random_password.pii.result
  })
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "random_password" "jwt_refresh" {
  length  = 48
  special = false
}

resource "random_password" "storage" {
  length  = 48
  special = false
}

resource "random_password" "pii" {
  length  = 64
  special = false
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}/api"
  retention_in_days = var.environment == "prod" ? 90 : 14
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name}/web"
  retention_in_days = var.environment == "prod" ? 90 : 14
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/${local.name}/migrate"
  retention_in_days = 30
}
