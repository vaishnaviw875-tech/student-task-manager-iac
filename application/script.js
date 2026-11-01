const API = "/api/tasks";
let tasks = [];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUSES = ["Pending", "In Progress", "Completed"];

const $ = (id) => document.getElementById(id);

function showMessage(text, ok = true) {
  const el = $("message");
  el.textContent = text;
  el.className = "message " + (ok ? "ok" : "err");
  if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 4000);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const f = $("filter").value;
  const visible = tasks
    .filter((t) => (!f || t.status === f) && (!q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const body = $("taskBody");
  body.innerHTML = "";
  for (const t of visible) {
    const tr = document.createElement("tr");
    if (t.status === "Completed") tr.className = "done";

    const cell = (text) => { const td = document.createElement("td"); td.textContent = text; return td; };
    tr.append(cell(t.id), cell(t.title));

    const pri = cell(t.priority);
    pri.className = "pri pri-" + t.priority;
    tr.append(pri);

    const statusTd = document.createElement("td");
    const sel = document.createElement("select");
    for (const s of STATUSES) {
      const o = document.createElement("option");
      o.textContent = s;
      o.selected = s === t.status;
      sel.append(o);
    }
    sel.addEventListener("change", () => updateStatus(t.id, sel.value));
    statusTd.append(sel);
    tr.append(statusTd);

    tr.append(cell(new Date(t.createdDate).toLocaleDateString()));

    const actionTd = document.createElement("td");
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => removeTask(t.id));
    actionTd.append(del);
    tr.append(actionTd);

    body.append(tr);
  }
  $("empty").hidden = visible.length > 0;

  const count = (s) => tasks.filter((t) => t.status === s).length;
  $("stats").innerHTML = "";
  for (const text of ["Total: " + tasks.length, "Pending: " + count("Pending"), "In Progress: " + count("In Progress"), "Completed: " + count("Completed")]) {
    const span = document.createElement("span");
    span.className = "stat";
    span.textContent = text;
    $("stats").append(span);
  }
}

async function loadTasks() {
  try {
    tasks = await api(API);
    render();
  } catch (e) {
    showMessage(e.message, false);
  }
}

async function addTask() {
  const title = $("title").value.trim();
  if (!title) return showMessage("Please enter a task title.", false);
  try {
    const task = await api(API, {
      method: "POST",
      body: JSON.stringify({ title, priority: $("priority").value, status: $("status").value }),
    });
    tasks.push(task);
    $("title").value = "";
    render();
    showMessage("Task " + task.id + " created.");
  } catch (e) {
    showMessage(e.message, false);
  }
}

async function updateStatus(id, status) {
  try {
    const updated = await api(API + "/" + id, { method: "PUT", body: JSON.stringify({ status }) });
    tasks = tasks.map((t) => (t.id === id ? updated : t));
    render();
    showMessage("Task " + id + " updated to " + status + ".");
  } catch (e) {
    showMessage(e.message, false);
    loadTasks();
  }
}

async function removeTask(id) {
  if (!confirm("Delete task " + id + "?")) return;
  try {
    await api(API + "/" + id, { method: "DELETE" });
    tasks = tasks.filter((t) => t.id !== id);
    render();
    showMessage("Task " + id + " deleted.");
  } catch (e) {
    showMessage(e.message, false);
  }
}

$("addBtn").addEventListener("click", addTask);
$("title").addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);
loadTasks();
