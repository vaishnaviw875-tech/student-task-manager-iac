# ---------------------------------------------------------------
# 1. Application code
#    worker.js contains three placeholders. Terraform replaces them
#    with the contents of index.html, style.css and script.js, so
#    the whole app is uploaded as ONE Worker script.
#    Editing any application file changes this value, so the next
#    "terraform plan" shows an update (this is what CI/CD uses).
# ---------------------------------------------------------------
locals {
  app_dir = "${path.module}/../application"

  worker_code = replace(
    replace(
      replace(
        file("${local.app_dir}/worker.js"),
        "\"__INDEX_HTML__\"", jsonencode(file("${local.app_dir}/index.html"))
      ),
      "\"__STYLE_CSS__\"", jsonencode(file("${local.app_dir}/style.css"))
    ),
    "\"__SCRIPT_JS__\"", jsonencode(file("${local.app_dir}/script.js"))
  )
}

# ---------------------------------------------------------------
# 2. Workers KV namespace (database for tasks)
# ---------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# ---------------------------------------------------------------
# 3. Cloudflare Worker + bindings
#    TASKS_KV     -> KV namespace (env.TASKS_KV in worker.js)
#    ENVIRONMENT  -> plain text variable
#    APP_TITLE    -> plain text variable
# ---------------------------------------------------------------
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.account_id
  script_name        = var.worker_name
  main_module        = "worker.js"
  content            = local.worker_code
  compatibility_date = "2025-09-01"

  bindings = [
    {
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.tasks.id
    },
    {
      type = "plain_text"
      name = "ENVIRONMENT"
      text = var.environment
    },
    {
      type = "plain_text"
      name = "APP_TITLE"
      text = var.app_title
    }
  ]
}

# ---------------------------------------------------------------
# 4. Publish the Worker on <worker>.<subdomain>.workers.dev
# ---------------------------------------------------------------
resource "cloudflare_workers_script_subdomain" "task_manager" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.task_manager.script_name
  enabled     = true
}
