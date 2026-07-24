environment          = "staging"
aws_region           = "ap-south-1"
desired_count_api    = 2
desired_count_web    = 2
db_instance_class    = "db.t4g.medium"
redis_node_type      = "cache.t4g.micro"
container_image_api  = "ghcr.io/CHANGE_ME/propos-api:staging"
container_image_web  = "ghcr.io/CHANGE_ME/propos-web:staging"
