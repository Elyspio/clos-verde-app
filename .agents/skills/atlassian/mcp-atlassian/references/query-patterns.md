# Query Patterns

Use these patterns to quickly shape Jira/Confluence requests.

## Confluence (CQL)

Common patterns:

- `type=page and title ~ "FEV 5.0" order by lastmodified desc`
- `space = "PROJ" and type=page and text ~ "\"release notes\""`
- `type=page and label = "conception" and lastmodified >= now("-30d")`

Use cases:

- Find design pages for a version.
- Restrict to one space.
- Focus on recently updated documentation.

## Jira (JQL)

Common patterns:

- `project = FEV and text ~ "\"5.0\"" ORDER BY updated DESC`
- `project = FEV AND issuetype in (Story, Bug) AND statusCategory != Done ORDER BY priority DESC, updated DESC`
- `project = FEV AND fixVersion = "5.0" ORDER BY key ASC`
- `assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`

Use cases:

- Locate issues tied to a release.
- Build active-work snapshots.
- Prepare release-note input from fixVersion.

## Output Template

Return minimal, comparable fields:

- Confluence: `title`, `space`, `id`, `updated`, `url`
- Jira: `key`, `summary`, `status`, `assignee`, `updated`, `url`

## REST Fallback (Only if MCP Is Unavailable)

Use fallback only when the MCP server is unavailable in the runtime and the user agrees.

PowerShell skeleton:

```powershell
$pair = "$env:ATLASSIAN_USER`:$env:ATLASSIAN_TOKEN"
$encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $encoded"; Accept = "application/json" }

# Confluence CQL search
$base = "https://your-domain.atlassian.net/wiki"
$cql = [uri]::EscapeDataString('type=page and title ~ "FEV 5.0"')
Invoke-RestMethod -Uri "$base/rest/api/search?cql=$cql&limit=50" -Headers $headers
```

Do not echo credentials or headers in user-visible responses.
