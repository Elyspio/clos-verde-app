---
name: mcp-atlassian
description: Use Atlassian through the mcp-atlassian server for Jira and Confluence discovery, analysis, and updates. Trigger when the user asks to search/read Confluence pages, query/create/update Jira issues, build summaries across Jira and Confluence, or troubleshoot Atlassian MCP connectivity.
---

# MCP Atlassian

Use a deterministic workflow to interact with Jira and Confluence through MCP while keeping outputs structured and safe.

## Workflow

### 1. Verify MCP Availability

Run capability discovery first:

1. `list_mcp_resources(server: "mcp-atlassian")`
2. `list_mcp_resource_templates(server: "mcp-atlassian")`

If the server is unknown in the current runtime:

1. Explain the difference between "configured in `mcp.json`" and "loaded in this session".
2. Confirm the local binary exists (`uvx mcp-atlassian --help`).
3. Continue with user-approved fallback (direct REST) only if MCP cannot be used.

### 2. Define Scope Before Querying

Collect or infer:

- Target system: `jira`, `confluence`, or both.
- Scope: project key(s), space key(s), labels, assignee, and date range.
- Task mode: `read-only` (default) or `write`.

Ask only for missing, blocking inputs. Otherwise proceed.

### 3. Execute Read Operations First

For Confluence tasks:

1. Search by title/content keywords.
2. Open matching pages and extract title, page ID, space, URL, and update date.
3. Summarize findings in the user language.

For Jira tasks:

1. Search issues by project/labels/status/assignee and text.
2. Retrieve issue key, summary, status, assignee, updated date, and URL.
3. Group or rank results to match the user goal (triage, release note input, backlog snapshot).

### 4. Gate Write Operations

Before any create/update/transition/comment action:

1. Present the exact change plan in one short checklist.
2. Ask explicit confirmation.
3. Execute only approved actions.
4. Report exactly what changed and what failed.

### 5. Return Structured Results

Use compact bullet lists with:

- Entity (`CONFLUENCE` or `JIRA`)
- Name or key
- Status (if applicable)
- Last update
- Direct link

For large results, provide top matches and mention applied filters.

## Safety Rules

- Never print API tokens, PATs, or authorization headers.
- Never copy secrets from config files into response text.
- Default to read-only behavior unless the user explicitly asks for writes.
- If a requested operation is ambiguous or high impact, ask for confirmation.

## Query Patterns

Use [query-patterns.md](./references/query-patterns.md) for reusable JQL/CQL patterns and safe fallback REST snippets.
