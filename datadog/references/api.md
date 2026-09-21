# Datadog API fallback

Load only when a usable connector is unavailable. Keep credentials in environment variables and never print them or commit their values.

Required environment variables:

```bash
DD_API_KEY="<from-secret-manager>"
DD_APP_KEY="<from-secret-manager>"
DD_SITE="${DD_SITE:-datadoghq.com}"
```

## Build the query

Use the [Datadog log search syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/):

- `service:<service> env:<environment>` — filter by service and environment
- `status:error` — only errors
- `status:warn` — only warnings
- `"exact phrase"` — exact match
- `*wildcard*` — wildcard match
- `termA AND termB` — both terms
- `termA OR termB` — either term
- `-term` — exclude term
- `@attribute:value` — filter by an indexed attribute

Use an absolute incident interval when available. Otherwise, Datadog accepts relative expressions such as `now-1h`, `now-6h`, `now-24h`, and `now-7d`.

## Query logs

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/logs/events/search" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "filter": {
      "query": "service:<service> env:<environment> status:error",
      "from": "now-1h",
      "to": "now"
    },
    "page": {
      "limit": 25
    },
    "sort": "-timestamp"
  }' | python3 -m json.tool
```

Run independent requests when searching multiple services or environments. Attribute every result to its service and environment.

## Query traces

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/spans/events/search" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "data": {
      "type": "search_request",
      "attributes": {
        "filter": {
          "query": "service:<service> env:<environment>",
          "from": "now-1h",
          "to": "now"
        },
        "page": {
          "limit": 25
        },
        "sort": "-timestamp"
      }
    }
  }' | python3 -m json.tool
```

To reconstruct a request flow, query all spans for an exact `trace_id` over the smallest interval that contains the incident.

## Present results

- Include UTC timestamps, service, environment, and status.
- Show concise messages and relevant request or trace IDs.
- Group repeated events and identify counts as samples when pagination is incomplete.
- Never include credentials, session tokens, personal data, or unredacted payloads.
- State the query scope and any sampling or retention gaps.
