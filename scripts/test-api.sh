#!/usr/bin/env bash
# Usage: ./scripts/test-api.sh https://student-task-manager.<subdomain>.workers.dev
set -e
URL="${1:?Pass the application URL}"
echo "== Create";  curl -s -X POST "$URL/api/tasks" -H "Content-Type: application/json" \
  -d '{"title":"Submit Project Report","priority":"High","status":"Pending"}'; echo
echo "== List";    curl -s "$URL/api/tasks"; echo
echo "== Get";     curl -s "$URL/api/tasks/T101"; echo
echo "== Update";  curl -s -X PUT "$URL/api/tasks/T101" -H "Content-Type: application/json" -d '{"status":"Completed"}'; echo
echo "== Delete";  curl -s -X DELETE "$URL/api/tasks/T101"; echo
echo "== List";    curl -s "$URL/api/tasks"; echo
