output "worker_name" {
  description = "Name of the deployed Worker."
  value       = cloudflare_workers_script.task_manager.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "kv_namespace_title" {
  description = "Title of the Workers KV namespace."
  value       = cloudflare_workers_kv_namespace.tasks.title
}

output "environment" {
  description = "Environment label configured for the Worker."
  value       = var.environment
}

output "app_url" {
  description = "Public URL of the application."
  value       = var.workers_subdomain != "" ? "https://${var.worker_name}.${var.workers_subdomain}.workers.dev" : "Set workers_subdomain in terraform.tfvars to see the full URL (or open Workers & Pages in the dashboard)."
}
