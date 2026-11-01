# Usage (PowerShell): .\scripts\test-api.ps1 -Url https://student-task-manager.<subdomain>.workers.dev
param([Parameter(Mandatory=$true)][string]$Url)
$h = @{ "Content-Type" = "application/json" }
Write-Host "== Create"
$t = Invoke-RestMethod -Method Post -Uri "$Url/api/tasks" -Headers $h -Body '{"title":"Submit Project Report","priority":"High","status":"Pending"}'
$t | ConvertTo-Json
$id = $t.id
Write-Host "== List";   Invoke-RestMethod -Uri "$Url/api/tasks" | ConvertTo-Json
Write-Host "== Get";    Invoke-RestMethod -Uri "$Url/api/tasks/$id" | ConvertTo-Json
Write-Host "== Update"; Invoke-RestMethod -Method Put -Uri "$Url/api/tasks/$id" -Headers $h -Body '{"status":"Completed"}' | ConvertTo-Json
Write-Host "== Delete"; Invoke-RestMethod -Method Delete -Uri "$Url/api/tasks/$id" | ConvertTo-Json
Write-Host "== List";   Invoke-RestMethod -Uri "$Url/api/tasks" | ConvertTo-Json
