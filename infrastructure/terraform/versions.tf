# PropOS — AWS ECS Fargate (Phase 8.2)
# Target: ap-south-1 (India data residency). Environments: dev | staging | prod.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Per-environment remote state — configure via -backend-config=
  # backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "PropOS"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "project" {
  type    = string
  default = "propos"
}

variable "domain_name" {
  type        = string
  description = "Public hostname for the ALB / CloudFront (optional for plan)"
  default     = ""
}

variable "container_image_api" {
  type    = string
  default = "ghcr.io/example/propos-api:latest"
}

variable "container_image_web" {
  type    = string
  default = "ghcr.io/example/propos-web:latest"
}

variable "desired_count_api" {
  type    = number
  default = 2
}

variable "desired_count_web" {
  type    = number
  default = 2
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

locals {
  name = "${var.project}-${var.environment}"
  azs  = ["${var.aws_region}a", "${var.aws_region}b"]
}

data "aws_caller_identity" "current" {}
