import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Prevent accidental reintroduction of legacy cloud database providers.
// Production persistence must remain Neon PostgreSQL only.
// Build provider names from fragments so this assertion cannot self-match.
const forbiddenTokens = [
  "fire" + "base",
  "fire" + "store",
  "sup" + "abase",
  "@mongodb/",
  "mongoose",
  "appwrite",
];
const blocked = forbiddenTokens.map((token) => token.toLowerCase());
const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const hits = [];
for (const path of trackedFiles) {
  if (path === "scripts/assert-neon-only.mjs") continue; // Provider denylist necessarily appears in this audit program.
  if (/\.md$/i.test(path)) continue; // Explanatory docs may name rejected providers without importing their SDKs.
  if (/\.(?:png|jpe?g|webp|ico|pdf|woff2?|ttf|zip|mp3|m4a|wav|webm|ogg)$/i.test(path)) continue;
  const normalizedPath = path.toLowerCase();
  if (blocked.some((token) => normalizedPath.includes(token))) {
    hits.push(path + " (filename)");
    continue;
  }
  let content;
  try { content = readFileSync(path, "utf8").toLowerCase(); }
  catch { continue; }
  if (blocked.some((token) => content.includes(token))) {
    hits.push(path + " (content)");
  }
}
if (hits.length) {
  process.stderr.write("Non-Neon persistence references detected:\n" + hits.join("\n") + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Neon-only repository guard passed; no legacy database provider references found.\n");
}
