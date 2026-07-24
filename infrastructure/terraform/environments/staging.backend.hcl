# Example remote state backends (create buckets/tables once per account).
# terraform init -backend-config=environments/staging.backend.hcl -reconfigure

bucket         = "propos-terraform-state-CHANGE_ME"
key            = "staging/terraform.tfstate"
region         = "ap-south-1"
dynamodb_table = "propos-terraform-locks"
encrypt        = true
