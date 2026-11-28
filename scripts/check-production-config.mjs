const problems = [];

if (process.env.NODE_ENV !== "production") {
  console.log("Local/development environment: production checks skipped.");
  process.exit(0);
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  problems.push("DATABASE_URL must point to a managed, non-SQLite database.");
}
if (
  !process.env.PASSWORD_RESET_WEBHOOK_URL ||
  !process.env.PASSWORD_RESET_WEBHOOK_URL.startsWith("https://")
) {
  problems.push("PASSWORD_RESET_WEBHOOK_URL must be configured with HTTPS.");
}
if (process.env.ALLOW_DEV_RESET_TOKEN === "true") {
  problems.push("ALLOW_DEV_RESET_TOKEN must be false in production.");
}
if (!["true", "false"].includes(process.env.TRUST_PROXY_HEADERS ?? "false")) {
  problems.push("TRUST_PROXY_HEADERS must be \"true\" or \"false\".");
}
if (process.env.TRUST_PROXY_HEADERS === "true") {
  console.error("WARNING: TRUST_PROXY_HEADERS=true requires a reverse proxy that overwrites X-Forwarded-For/X-Real-IP.");
}
if (process.env.RATE_LIMIT_SHARED_STORE_CONFIGURED !== "true") {
  problems.push("A shared atomic rate-limit store must be configured for production.");
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`BLOCKER: ${problem}`);
  process.exit(1);
}

console.log("Production configuration prerequisites satisfied.");
