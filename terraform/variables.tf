variable "account_id" {
  description = "Cloudflare Account ID (Dashboard > Workers & Pages > right side panel)."
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker."
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Title of the Workers KV namespace that stores the tasks."
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment label (dev, test or production)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "production"], var.environment)
    error_message = "environment must be one of: dev, test, production."
  }
}

variable "app_title" {
  description = "Title shown in the web application."
  type        = string
  default     = "Student Task Manager"
}

variable "workers_subdomain" {
  description = "Your account workers.dev subdomain (the part before .workers.dev). Only used to build the output URL."
  type        = string
  default     = ""
}
