export type AgentId = "codex" | "claude" | "cursor" | "chatgpt" | "mcp";

export type AgentPreset = {
  id: AgentId;
  name: string;
  label: string;
  detail: string;
  command?: (mcpUrl: string) => string;
  config?: (mcpUrl: string) => string;
  note: string;
};

export function mcpUrl() {
  return (
    (import.meta.env.VITE_INSTANTSTUDY_MCP_URL as string | undefined) ||
    "https://YOUR_INSTANTSTUDY_HOST/mcp"
  );
}

export function openApiUrl() {
  return (
    (import.meta.env.VITE_INSTANTSTUDY_OPENAPI_URL as string | undefined) ||
    "https://YOUR_INSTANTSTUDY_HOST/openapi.yaml"
  );
}

export const agentPresets: AgentPreset[] = [
  {
    id: "codex",
    name: "Codex",
    label: "CLI + IDE",
    detail: "One command, shared across Codex CLI and IDE.",
    command: (url) => `codex mcp add instantstudy --url ${url}`,
    config: (url) =>
      `[mcp_servers.instantstudy]\nurl = "${url}"\nbearer_token_env_var = "INSTANTSTUDY_MCP_API_KEY"`,
    note: "Set INSTANTSTUDY_MCP_API_KEY in your environment. Codex sends it as the bearer token.",
  },
  {
    id: "claude",
    name: "Claude Code",
    label: "Remote MCP",
    detail: "Add InstantStudy as a remote HTTP MCP server.",
    command: (url) =>
      `claude mcp add --transport http --scope user instantstudy ${url} --header "Authorization: Bearer $INSTANTSTUDY_MCP_API_KEY"`,
    note: "Set INSTANTSTUDY_MCP_API_KEY first, then run /mcp to verify the authenticated connection.",
  },
  {
    id: "cursor",
    name: "Cursor",
    label: "mcp.json",
    detail: "Add InstantStudy once and use it from Agent mode.",
    config: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            instantstudy: {
              url,
              headers: {
                Authorization: "Bearer ${env:INSTANTSTUDY_MCP_API_KEY}",
              },
            },
          },
        },
        null,
        2,
      ),
    note: "Put this in ~/.cursor/mcp.json, restart Cursor, then invoke InstantStudy from the agent.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    label: "Plugin / MCP",
    detail: "Public ChatGPT integration uses OAuth, not the shared private MCP key.",
    config: (url) =>
      JSON.stringify(
        {
          mcpServers: {
            instantstudy: {
              type: "streamable-http",
              url: url.replace(/\/mcp$/, "/mcp/chatgpt"),
              extensions: {
                "com.openai": {
                  auth: { type: "oauth", baseScopes: ["study:read", "study:write"] },
                },
              },
            },
          },
        },
        null,
        2,
      ),
    note: "Requires a configured OAuth 2.1 issuer, signed account binding, active entitlement and plugin approval. This does not automatically install or publish the plugin.",
  },
  {
    id: "mcp",
    name: "Any MCP agent",
    label: "Streamable HTTP",
    detail: "Use the same endpoint from any standards-compatible agent.",
    config: (url) => url,
    note: "Send Authorization: Bearer <token> on every MCP request. Production public distribution should use per-user OAuth.",
  },
];
