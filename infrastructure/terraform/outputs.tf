output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_api" {
  value = aws_ecs_service.api.name
}

output "ecs_service_web" {
  value = aws_ecs_service.web.name
}

output "migrate_task_definition" {
  value = aws_ecs_task_definition.migrate.arn
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "s3_docs_bucket" {
  value = aws_s3_bucket.docs.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.docs.domain_name
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "vpc_id" {
  value = aws_vpc.main.id
}
