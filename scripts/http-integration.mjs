import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-http-test-"));
const dbPath = path.join(tempRoot, "http.db");
const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;
const port = 34000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function cookiesFrom(response, previous = {}) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
  const jar = { ...previous };
  for (const value of values) {
    const pair = value.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > 0) jar[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function request(method, endpoint, { body, cookie, jar } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const cookieValue = jar ? cookieHeader(jar) : cookie;
  if (cookieValue) headers.Cookie = cookieValue;
  if (jar?.workdesk_csrf && ["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers["x-csrf-token"] = jar.workdesk_csrf;
  }
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, headers: response.headers };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Server did not become ready");
}

try {
  execFileSync(
    process.execPath,
    [path.join(repoRoot, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    },
  );

  server = spawn(
    process.execPath,
    [path.join(repoRoot, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "ignore",
    },
  );

  await waitForServer();

  const suffix = Date.now();
  const emailA = `v2-user-a-${suffix}@example.invalid`;
  const emailB = `v2-user-b-${suffix}@example.invalid`;
  const emailC = `v2-user-c-${suffix}@example.invalid`;

  const registerA = await request("POST", "/api/auth/register", {
    body: { name: "User A", email: emailA, password: "Testpass123!" },
  });
  check("registration succeeds", registerA.status === 201, `status ${registerA.status}`);
  const jarA = cookiesFrom(registerA);
  const workspaceA = registerA.json?.workspaceId;
  const userA = registerA.json?.user?.id;

  const meA = await request("GET", "/api/auth/me", { jar: jarA });
  check("session authenticates", meA.status === 200 && meA.json?.user?.id === userA);

  const nullBody = await request("POST", `/api/tasks?workspaceId=${workspaceA}`, {
    body: null,
    jar: jarA,
  });
  check("null task body returns 400", nullBody.status === 400, `status ${nullBody.status}`);

  const githubUrl = `https://github.com/example/repo-${suffix}`;
  const taskBody = {
    title: `HTTP task ${suffix}`,
    priority: "MEDIUM",
    assigneeId: userA,
    links: [githubUrl],
  };
  const createTask = await request("POST", `/api/tasks?workspaceId=${workspaceA}`, {
    body: taskBody,
    jar: jarA,
  });
  check("task creation succeeds", createTask.status === 201, JSON.stringify(createTask.json));
  const taskId = createTask.json?.id;

  const createdLinks = await request("GET", `/api/tasks/${taskId}/links`, {
    jar: jarA,
  });
  check(
    "task created with a link lists it",
    createdLinks.status === 200 &&
      Array.isArray(createdLinks.json) &&
      createdLinks.json.some((link) => link.url === githubUrl),
    JSON.stringify(createdLinks.json),
  );

  const badLink = await request("POST", `/api/tasks/${taskId}/links`, {
    body: { url: "javascript:alert(1)" },
    jar: jarA,
  });
  check("non-http link returns 400", badLink.status === 400, `status ${badLink.status}`);

  const duplicate = await request("POST", `/api/tasks?workspaceId=${workspaceA}`, {
    body: taskBody,
    jar: jarA,
  });
  check("duplicate task returns 409", duplicate.status === 409, `status ${duplicate.status}`);

  const list = await request("GET", "/api/tasks", { jar: jarA });
  check(
    "task list is bounded and reports totals",
    Array.isArray(list.json) && list.headers.get("x-total-count") !== null,
  );

  const registerB = await request("POST", "/api/auth/register", {
    body: { name: "User B", email: emailB, password: "Testpass123!" },
  });
  check("second registration succeeds", registerB.status === 201);
  const jarB = cookiesFrom(registerB);

  const outsiderLinks = await request("GET", `/api/tasks/${taskId}/links`, {
    jar: jarB,
  });
  check(
    "non-member cannot read task links",
    outsiderLinks.status === 403,
    `status ${outsiderLinks.status}`,
  );

  const crossWorkspace = await request("PATCH", `/api/tasks/${taskId}`, {
    body: { title: "Hijacked title" },
    jar: jarB,
  });
  check("cross-workspace task edit is denied", crossWorkspace.status === 403, `status ${crossWorkspace.status}`);

  const addMember = await request("POST", `/api/workspaces/${workspaceA}/members/add`, {
    body: { email: emailB, role: "MEMBER" },
    jar: jarA,
  });
  check("admin can add existing user to workspace", addMember.status === 201, JSON.stringify(addMember.json));

  const memberLink = await request("POST", `/api/tasks/${taskId}/links`, {
    body: { url: `https://example.com/spec-${suffix}`, title: "Spec" },
    jar: jarB,
  });
  check(
    "workspace member can add a link",
    memberLink.status === 201,
    JSON.stringify(memberLink.json),
  );

  const creatorsLink = createdLinks.json?.find((link) => link.createdBy?.id === userA);
  const deleteOthers = await request(
    "DELETE",
    `/api/tasks/${taskId}/links/${creatorsLink?.id}`,
    { jar: jarB },
  );
  check(
    "member cannot delete another member's link",
    deleteOthers.status === 403,
    `status ${deleteOthers.status}`,
  );

  const deleteOwn = await request(
    "DELETE",
    `/api/tasks/${taskId}/links/${memberLink.json?.id}`,
    { jar: jarB },
  );
  check(
    "link creator can delete their link",
    deleteOwn.status === 200,
    `status ${deleteOwn.status}`,
  );

  const hijack = await request("PATCH", `/api/tasks/${taskId}`, {
    body: { assigneeId: registerB.json?.user?.id },
    jar: jarB,
  });
  check("member cannot take an assigned task", hijack.status === 403, `status ${hijack.status}`);

  const unassigned = await request("POST", `/api/tasks?workspaceId=${workspaceA}`, {
    body: { title: `Unassigned ${suffix}` },
    jar: jarA,
  });
  check("unassigned task creation succeeds", unassigned.status === 201);

  const comment = await request("POST", `/api/tasks/${unassigned.json?.id}/comments`, {
    body: { content: "Regression comment" },
    jar: jarB,
  });
  check("comment on unassigned task returns 201", comment.status === 201, JSON.stringify(comment.json));

  const selfRole = await request("PATCH", `/api/workspaces/${workspaceA}/members/${userA}`, {
    body: { role: "MEMBER" },
    jar: jarA,
  });
  check("last admin cannot self-demote", selfRole.status === 400, `status ${selfRole.status}`);

  const invite = await request("POST", `/api/workspaces/${workspaceA}/invitations`, {
    body: { email: emailC, role: "MEMBER" },
    jar: jarA,
  });
  check("invitation creation succeeds", invite.status === 201, JSON.stringify(invite.json));

  const registerC = await request("POST", "/api/auth/register", {
    body: { name: "User C", email: emailC, password: "Testpass123!" },
  });
  const jarC = cookiesFrom(registerC);
  const accept = await request("POST", "/api/invitations/accept", {
    body: { token: invite.json?.token },
    jar: jarC,
  });
  check("invitation acceptance succeeds", accept.status === 200, JSON.stringify(accept.json));

  const logout = await request("POST", "/api/auth/logout", { jar: jarA });
  const meAfterLogout = await request("GET", "/api/auth/me", { jar: jarA });
  check(
    "logout invalidates the session",
    logout.status === 200 && meAfterLogout.json?.user === null,
  );
} catch (error) {
  failures += 1;
  console.error(`FAIL harness: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

if (failures > 0) {
  console.error(`${failures} HTTP integration check(s) failed`);
  process.exit(1);
}
console.log("HTTP integration checks passed");
