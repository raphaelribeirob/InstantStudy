# Agent connections

InstantStudy exposes one remote Streamable HTTP MCP endpoint:

```
https://YOUR_INSTANTSTUDY_HOST/mcp
```

and a provider-neutral OpenAPI fallback:

```
https://YOUR_INSTANTSTUDY_HOST/openapi.yaml
```

The hosted backend also publishes:

```
GET /connection.json
```

## Codex

```bash
codex mcp add instantstudy --url https://YOUR_INSTANTSTUDY_HOST/mcp
codex mcp list
```

Equivalent config:

```toml
[mcp_servers.instantstudy]
url = "https://YOUR_INSTANTSTUDY_HOST/mcp"
```

## Claude Code

```bash
claude mcp add --transport http --scope user instantstudy https://YOUR_INSTANTSTUDY_HOST/mcp
claude mcp list
```

Inside Claude Code, use `/mcp` to verify the connection.

## Cursor

```json
{
  "mcpServers": {
    "instantstudy": {
      "url": "https://YOUR_INSTANTSTUDY_HOST/mcp"
    }
  }
}
```

Store it in the MCP configuration used by Cursor and restart the client.

## ChatGPT / plugin packaging

InstantStudy's backend is already a remote MCP server. Plugin packaging can point its MCP entry at the same endpoint:

```json
{
  "mcpServers": {
    "instantstudy": {
      "type": "streamable-http",
      "url": "https://YOUR_INSTANTSTUDY_HOST/mcp"
    }
  }
}
```

Public installation still depends on hosting the endpoint and publishing/reviewing the plugin package.

## Generic agent

Any tool host that supports remote Streamable HTTP MCP can use the MCP URL.

For hosts that only support custom HTTP/function tools, use the OpenAPI contract.

## What the agent receives

Core tools:

- `prepare_study`
- `next_study_question`
- `submit_study_answer`
- `finish_study_session`
- `get_study_session`

Optional Anki tools:

- `anki_status`
- `list_decks`
- `get_due_cards`
- `search_cards`
- `create_card`
- `record_review`

## Product instruction

A connected agent should interpret short commands such as:

```
InstantStudy this.
```

```
Quiz me on this PDF.
```

```
Let's study for 15 minutes.
```

as permission to call InstantStudy, start with `prepare_study`, ask one question at a time, submit the semantic evaluation after each answer, and follow the returned adaptive policy.
