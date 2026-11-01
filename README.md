# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

A task manager (add / view / update / delete) running on **Cloudflare Workers** with data in **Workers KV**.
All infrastructure is created by **Terraform**; deployment is automated by **GitHub Actions**.

```
git push -> GitHub Actions -> Terraform -> Cloudflare Worker + Workers KV -> Student Task Manager
```

## Project structure

```
student-task-manager-iac/
├── terraform/
│   ├── providers.tf              # Cloudflare provider (no secrets)
│   ├── variables.tf              # account_id, worker_name, kv_namespace_name, environment, ...
│   ├── main.tf                   # KV namespace + Worker + KV binding + workers.dev URL
│   ├── outputs.tf                # worker name, KV id, app URL
│   ├── terraform.tfvars.example  # copy to terraform.tfvars (git-ignored)
│   └── backend.tf.example        # remote state, used only by GitHub Actions
├── application/
│   ├── worker.js                 # REST API + KV logic + serves the UI
│   ├── index.html  style.css  script.js
├── .github/workflows/deploy.yml  # CI/CD
├── scripts/test-api.ps1 | test-api.sh
├── screenshots/                  # put your evidence here
├── .gitignore
└── README.md
```

---

## QUICK START (5 minutes, once the tools are installed)

```powershell
cd student-task-manager-iac\terraform
copy terraform.tfvars.example terraform.tfvars      # then edit account_id + workers_subdomain
$env:CLOUDFLARE_API_TOKEN = "your-token"            # Windows PowerShell
terraform init
terraform validate
terraform plan
terraform apply                                     # type: yes
```
Open the `app_url` printed at the end. Done.
(macOS/Linux: use `export CLOUDFLARE_API_TOKEN="your-token"` and `cp` instead of `copy`.)

---

## DETAILED STEPS

### Part A - Install the tools (Windows)

1. **Git** - https://git-scm.com/downloads, install with defaults. Check: `git --version`
2. **Terraform** - open PowerShell and run `winget install Hashicorp.Terraform`
   (or download from https://developer.hashicorp.com/terraform/install and add it to PATH).
   **Close and reopen PowerShell**, then check: `terraform --version`  *(screenshot)*
3. **VS Code** (optional) - https://code.visualstudio.com
4. Create accounts: **Cloudflare** (free) and **GitHub** (free).

### Part B - Cloudflare setup (one-time)

1. Log in at https://dash.cloudflare.com
2. Go to **Workers & Pages**. If it asks you to choose a **workers.dev subdomain**, choose one and save it.
   Your URLs will look like `https://<worker>.<subdomain>.workers.dev`.
3. **Find your Account ID:** on the Workers & Pages overview page, right-hand side panel -> copy **Account ID**.
4. **Create an API token:** top-right profile icon -> **My Profile -> API Tokens -> Create Token -> Create Custom Token**
   - Permissions (all under *Account*):
     - `Workers Scripts` : **Edit**
     - `Workers KV Storage` : **Edit**
     - `Account Settings` : **Read**
   - Account Resources: Include -> your account
   - Create and **copy the token now** (it is shown only once). Never put it in any file in this project.

### Part C - Run the project locally with Terraform

1. Open the project folder in a terminal:
   ```powershell
   cd path\to\student-task-manager-iac\terraform
   ```
2. Create your config file:
   ```powershell
   copy terraform.tfvars.example terraform.tfvars
   notepad terraform.tfvars
   ```
   Fill in `account_id` and `workers_subdomain`. Save.
3. Set the token for this terminal session:
   ```powershell
   $env:CLOUDFLARE_API_TOKEN = "PASTE_TOKEN_HERE"
   ```
4. **Init** (downloads the Cloudflare provider) *(screenshot)*
   ```powershell
   terraform init
   ```
5. **Format and validate** *(screenshot of validate)*
   ```powershell
   terraform fmt
   terraform validate
   ```
6. **Plan** - shows what will be created. Highlight the `+` resources in your screenshot:
   `cloudflare_workers_kv_namespace.tasks`, `cloudflare_workers_script.task_manager`, `cloudflare_workers_script_subdomain.task_manager`
   ```powershell
   terraform plan
   ```
7. **Apply** - type `yes` when asked. Expect `Apply complete! Resources: 3 added` *(screenshot)*
   ```powershell
   terraform apply
   ```
8. **Verify** in the dashboard (view only): Workers & Pages -> `student-task-manager`, Storage & Databases -> KV -> `student_tasks`,
   Worker -> Settings -> Bindings -> `TASKS_KV` *(screenshots)*
9. **Open the app**: run `terraform output app_url`, open the link in a browser.
10. **Test CRUD** in the web UI (Create, Read, Update status, Delete) *(screenshots)*, and/or from the terminal:
    ```powershell
    cd ..
    .\scripts\test-api.ps1 -Url https://student-task-manager.YOUR-SUBDOMAIN.workers.dev
    ```
    If PowerShell blocks the script: `Set-ExecutionPolicy -Scope Process Bypass`
11. **Show the state**: `terraform show`
12. **Modify infrastructure** (required experiment). Edit `terraform.tfvars`, for example:
    ```
    environment = "test"
    app_title   = "Cloud-Based Student Task Manager"
    ```
    Run `terraform plan` (it shows `~` update in place, not a re-create), explain the difference, then `terraform apply`.
    Refresh the page: the title and the environment badge changed.

### Part D - Git and GitHub

1. Create an **empty** repository on GitHub named `student-task-manager-iac` (no README, no .gitignore).
2. Generate the lock file for all platforms (so GitHub's Linux runner accepts it):
   ```powershell
   cd terraform
   terraform providers lock -platform=windows_amd64 -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64
   cd ..
   ```
3. Commit and push (use several meaningful commits for marks):
   ```powershell
   git init
   git branch -M main
   git add terraform/providers.tf terraform/variables.tf .gitignore
   git commit -m "Initial Terraform configuration"
   git add terraform/main.tf terraform/outputs.tf terraform/terraform.tfvars.example terraform/.terraform.lock.hcl
   git commit -m "Added KV namespace, Worker and Worker KV binding"
   git add application scripts
   git commit -m "Added CRUD API and frontend"
   git remote add origin https://github.com/YOUR-USERNAME/student-task-manager-iac.git
   git push -u origin main
   ```
   (The workflow file is added later in Part E, after the secrets exist, so no failed run happens now.)
4. Check on GitHub that **`terraform.tfvars` and `*.tfstate` are NOT in the repository.** (They are in `.gitignore`.)

### Part E - CI/CD with GitHub Actions

GitHub's runners are temporary machines, so they cannot see your laptop's state file. If CI used its own empty state it would try to create resources that already exist. So the pipeline uses a **free remote state** in HCP Terraform.

1. **Start from a clean Cloudflare account** for this project: run `terraform destroy` locally (type `yes`). This is also the required destroy demo. The pipeline will create everything again.
2. **HCP Terraform** (https://app.terraform.io, free):
   - Create an account and an **Organization** (e.g. `my-student-org`).
   - **Workspaces -> New -> CLI-driven workflow** -> name it `student-task-manager`.
   - Workspace **Settings -> General -> Execution Mode = Local** -> Save.
   - Top-right avatar -> **Account settings -> Tokens -> Create an API token** -> copy it.
3. **GitHub repository -> Settings -> Secrets and variables -> Actions**
   - **Secrets** tab -> New repository secret:
     | Name | Value |
     |---|---|
     | `CLOUDFLARE_API_TOKEN` | your Cloudflare token |
     | `CLOUDFLARE_ACCOUNT_ID` | your Cloudflare account ID |
     | `TF_API_TOKEN` | your HCP Terraform token |
   - **Variables** tab -> New repository variable:
     | Name | Value |
     |---|---|
     | `TF_CLOUD_ORGANIZATION` | your HCP organization name |
     | `TF_WORKSPACE` | `student-task-manager` |
     | `WORKERS_SUBDOMAIN` | your workers.dev subdomain |
4. **Trigger the pipeline** by adding the workflow and pushing:
   ```powershell
   git add .github
   git commit -m "Added GitHub Actions"
   git push
   ```
5. GitHub -> **Actions** tab -> watch the run: Checkout -> Install Terraform -> fmt -> init -> validate -> plan -> apply. *(screenshot of the green run)*
6. Open the app URL again: it is live, deployed by the pipeline.
7. **Automatic update demo** - change the title (set `default = "Cloud-Based Student Task Manager"` for `app_title` in `variables.tf`), then:
   ```powershell
   git add .
   git commit -m "Update application title"
   git push
   ```
   A new Actions run starts and the live site title changes.

### Part F - Destroy and recreate

If you use the pipeline's remote state, run these locally after enabling the same backend:
```powershell
cd terraform
copy backend.tf.example backend.tf
$env:TF_CLOUD_ORGANIZATION = "your-org"
$env:TF_WORKSPACE = "student-task-manager"
terraform login
terraform init
```
Then:
```powershell
terraform plan -destroy        # shows what will be removed
terraform destroy              # type yes -> "Destroy complete!"  (screenshot)
```
Verify in the dashboard that the Worker and KV namespace are gone, then recreate **without touching the dashboard**:
```powershell
terraform plan
terraform apply                # the whole environment is back (screenshot)
```
(If you only used local state for the whole project, you can do Part F locally without any backend. Delete `backend.tf` afterwards if you do not want to use remote state locally.)

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tasks` | Create. Body: `{"title":"...","priority":"High\|Medium\|Low","status":"Pending\|In Progress\|Completed"}` |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/{id}` | Get one task, e.g. `T101` |
| PUT | `/api/tasks/{id}` | Update any of title / priority / status |
| DELETE | `/api/tasks/{id}` | Delete a task |
| GET | `/api/health` | Health check, returns environment |

A task looks like: `{"id":"T101","title":"Submit Cloud Computing Assignment","priority":"High","status":"Pending","createdDate":"2026-11-01T10:00:00.000Z"}`

## Troubleshooting

| Problem | Fix |
|---|---|
| `terraform` not recognised | Close and reopen the terminal after install; check PATH. |
| `Authentication error` / `10000` | Token wrong, expired, or missing permissions. Re-create it with the permissions in Part B and set `$env:CLOUDFLARE_API_TOKEN` again in the *same* terminal. |
| `No value for required variable account_id` | `terraform.tfvars` missing or not in the `terraform/` folder. |
| `workers.dev subdomain` error on apply | Open Workers & Pages in the dashboard once and register your subdomain (Part B step 2). |
| `A namespace with this title already exists` / Worker already exists | A previous run (or manual creation) left it. Delete the leftover in the dashboard, or change `kv_namespace_name` / `worker_name`. |
| Error mentions an unsupported argument in `cloudflare_workers_script` | Provider major versions change syntax. This project targets Cloudflare provider `~> 5.11`. Run `terraform init -upgrade` and check the provider docs for the attribute named in the error. |
| New task takes a moment to show in other regions | Workers KV is eventually consistent (changes can take up to ~60 s to appear everywhere). The UI updates instantly for you. |
| GitHub Action fails at init with a checksum error | Run the `terraform providers lock ...` command in Part D step 2 and commit `.terraform.lock.hcl`. |
| Action fails: `No credentials` for HCP | `TF_API_TOKEN` secret missing, or `TF_CLOUD_ORGANIZATION` / `TF_WORKSPACE` variables not set. |

## Security rules

- API tokens are only ever in environment variables or GitHub Secrets - never in `.tf` files.
- `terraform.tfvars`, `*.tfstate` and `.terraform/` are in `.gitignore`.
- Do not edit Terraform-managed resources in the dashboard (it causes *drift*; Terraform will revert or conflict).
