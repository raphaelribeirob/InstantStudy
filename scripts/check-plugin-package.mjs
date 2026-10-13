import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "plugins/instantstudy");
const manifest = JSON.parse(readFileSync(resolve(root, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(resolve(root, "mcp.json"), "utf8"));
const page = manifest.extensions?.["com.openai"]?.interface ?? {};
const server = mcp.mcpServers?.instantstudy;
const auth = server?.extensions?.["com.openai"]?.auth;
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const isHttps = (value) => {
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; }
  catch { return false; }
};

assert(manifest.name === "instantstudy", "Name must match InstantStudy");
assert(/^\d+\.\d+\.\d+$/.test(manifest.version ?? ""), "Version must be semver");
assert(page.displayName === "InstantStudy", "Invalid display name");
assert(typeof page.shortDescription === "string" && page.shortDescription.length <= 30,
  "Directory short description exceeds 30 characters");
assert(typeof page.longDescription === "string" && page.longDescription.length > 0,
  "Long description required");
assert(page.category === "Education & Research", "Invalid education listing category");
assert(Array.isArray(page.defaultPrompt) && page.defaultPrompt.length === 3 &&
  new Set(page.defaultPrompt).size === 3, "Three unique starter prompts required");
assert(Array.isArray(page.capabilities) && page.capabilities.every(x => x.length <= 120),
  "Capabilities must be concise");
for (const attr of ["logo", "composerIcon"]) {
  assert(typeof page[attr] === "string" &&
    page[attr].startsWith("./") &&
    existsSync(resolve(root, page[attr])), `Missing bundled ${attr}`);
}
assert(existsSync(resolve(root, "skills/setup/SKILL.md")), "Missing setup skill");
assert(existsSync(resolve(root, "skills/study/SKILL.md")), "Missing study skill");
assert(isHttps(server?.url) && server.url.endsWith("/mcp/chatgpt"),
  "Plugin must connect only to the OAuth-specific HTTPS MCP endpoint");
assert(server?.type === "streamable-http", "MCP transport must be Streamable HTTP");
assert(auth?.client?.mode === "dcr", "Auth0 ChatGPT MCP requires DCR registration");
assert(auth?.type === "oauth" &&
  !JSON.stringify(auth).includes("api_key") &&
  !JSON.stringify(auth).includes("clientSecret"),
  "Public plugin must use OAuth, never static bearer or embedded secrets");
assert(["study:read", "study:write"].every(x => auth?.baseScopes?.includes(x)),
  "OAuth scopes missing");
assert(isHttps(page.websiteURL), "Missing HTTPS product website");

const legal = ["supportURL", "privacyPolicyURL", "termsOfServiceURL"];
if (process.argv.includes("--release")) {
  for (const key of legal) assert(isHttps(page[key]), `Release gate: missing HTTPS ${key}`);
}
if (failures.length) {
  for (const issue of failures) console.error("FAIL", issue);
  process.exitCode = 1;
} else {
  console.log(process.argv.includes("--release")
    ? "Static release metadata passed; live auth, review credentials and server scans still required."
    : "InstantStudy plugin static package checks passed.");
}
