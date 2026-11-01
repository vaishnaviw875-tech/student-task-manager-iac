// Student Task Manager - Cloudflare Worker
// Serves the web UI and a REST API backed by Workers KV (binding: TASKS_KV).
//
// The three placeholders below are replaced by Terraform (see terraform/main.tf)
// with the contents of index.html, style.css and script.js before upload.
const INDEX_HTML = "__INDEX_HTML__";
const STYLE_CSS = "__STYLE_CSS__";
const SCRIPT_JS = "__SCRIPT_JS__";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Pending", "In Progress", "Completed"];
const TASK_PREFIX = "task:";
const COUNTER_KEY = "meta:counter";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const error = (message, status = 400) => json({ error: message }, status);

async function listTasks(env) {
  const tasks = [];
  let cursor;
  do {
    const page = await env.TASKS_KV.list({ prefix: TASK_PREFIX, cursor });
    const items = await Promise.all(page.keys.map((k) => env.TASKS_KV.get(k.name, "json")));
    for (const t of items) if (t) tasks.push(t);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  tasks.sort((a, b) => (a.createdDate < b.createdDate ? -1 : a.createdDate > b.createdDate ? 1 : a.id.localeCompare(b.id, undefined, { numeric: true })));
  return tasks;
}

async function nextId(env) {
  const current = parseInt((await env.TASKS_KV.get(COUNTER_KEY)) || "100", 10);
  const next = current + 1;
  await env.TASKS_KV.put(COUNTER_KEY, String(next));
  return "T" + next;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validate(body, { partial }) {
  const out = {};
  if (body.title !== undefined || !partial) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return { error: "title is required" };
    if (title.length > 200) return { error: "title must be at most 200 characters" };
    out.title = title;
  }
  if (body.priority !== undefined || !partial) {
    const priority = body.priority ?? "Medium";
    if (!PRIORITIES.includes(priority)) return { error: "priority must be one of " + PRIORITIES.join(", ") };
    out.priority = priority;
  }
  if (body.status !== undefined || !partial) {
    const status = body.status ?? "Pending";
    if (!STATUSES.includes(status)) return { error: "status must be one of " + STATUSES.join(", ") };
    out.status = status;
  }
  return { value: out };
}

async function handleApi(request, env, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api","tasks",":id"]
  const method = request.method;

  if (parts[1] === "health") {
    return json({ status: "ok", environment: env.ENVIRONMENT });
  }
  if (parts[1] !== "tasks") return error("Not found", 404);

  const id = parts[2];

  // Collection: /api/tasks
  if (!id) {
    if (method === "GET") return json(await listTasks(env));
    if (method === "POST") {
      const body = await readBody(request);
      if (!body || typeof body !== "object") return error("Invalid JSON body");
      const v = validate(body, { partial: false });
      if (v.error) return error(v.error);
      const task = {
        id: await nextId(env),
        ...v.value,
        createdDate: new Date().toISOString(),
      };
      await env.TASKS_KV.put(TASK_PREFIX + task.id, JSON.stringify(task));
      return json(task, 201);
    }
    return error("Method not allowed", 405);
  }

  // Item: /api/tasks/{id}
  const key = TASK_PREFIX + id;
  const existing = await env.TASKS_KV.get(key, "json");
  if (!existing) return error("Task " + id + " not found", 404);

  if (method === "GET") return json(existing);

  if (method === "PUT") {
    const body = await readBody(request);
    if (!body || typeof body !== "object") return error("Invalid JSON body");
    const v = validate(body, { partial: true });
    if (v.error) return error(v.error);
    const updated = { ...existing, ...v.value, id: existing.id, createdDate: existing.createdDate };
    await env.TASKS_KV.put(key, JSON.stringify(updated));
    return json(updated);
  }

  if (method === "DELETE") {
    await env.TASKS_KV.delete(key);
    return json({ deleted: id });
  }

  return error("Method not allowed", 405);
}

const fill = (text, env) =>
  text.replaceAll("{{APP_TITLE}}", env.APP_TITLE || "Student Task Manager").replaceAll("{{ENVIRONMENT}}", env.ENVIRONMENT || "dev");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);

      if (request.method !== "GET" && request.method !== "HEAD") return error("Method not allowed", 405);

      if (url.pathname === "/" || url.pathname === "/index.html")
        return new Response(fill(INDEX_HTML, env), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (url.pathname === "/style.css")
        return new Response(STYLE_CSS, { headers: { "Content-Type": "text/css; charset=utf-8" } });
      if (url.pathname === "/script.js")
        return new Response(SCRIPT_JS, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });

      return error("Not found", 404);
    } catch (e) {
      return error("Internal error: " + e.message, 500);
    }
  },
};
