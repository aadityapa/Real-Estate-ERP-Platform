environment          = "prod"
aws_region           = "ap-south-1"
desired_count_api    = 3
desired_count_web    = 3
db_instance_class    = "db.r6g.large"
redis_node_type      = "cache.r6g.large"
container_image_api  = "ghcr.io/CHANGE_ME/propos-api:latest"
container_image_web  = "ghcr.io/CHANGE_ME/propos-web:latest"
