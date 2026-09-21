---
name: datadog
description: Search Datadog logs and traces across user-specified services and environments. Use when asked to check Datadog logs, investigate errors, trace requests, or debug issues in Datadog.
---

# Search Datadog logs and traces

## Bounded search

- Reuse an existing Datadog connector when its search capability is available. Discover only log search or span search as needed. Otherwise use [references/api.md](references/api.md) for the API fallback, loading credential values programmatically without printing them.
- Preserve user-specified service names, environments, intervals, and result caps. If no environment is specified, ask for it unless the query is explicitly intended to span every accessible environment. Keep environment attribution in results.
- Prefer exact request/trace IDs and indexed attributes. Use logs first; query spans only for a distributed flow, latency question, or missing correlation.
- Use the incident's absolute UTC interval when supplied; otherwise default to the last hour. Start with one page of at most 25 events per query. Query independent IDs together when supported and verify coverage per ID.
- Return compact selected fields: timestamp UTC, service/environment, status, message, request/trace ID, container and task version when present. Sanitize sensitive values. Keep larger raw responses local and out of model context; group repeated messages and label sample counts as samples.
- Paginate only when needed for the question; stop once evidence answers it. Do not claim complete counts from a capped sample. Widen environments, time range, or result caps only within existing authorization; ask only when broadening would exceed it.
- For newly emitted logs, use bounded ingestion retries only if eventual ingestion matters: set the deadline before polling (default two minutes), retry at 15–30 second intervals, stop as soon as every required ID appears, and report missing evidence at the deadline. Do not poll historical zero-result queries unchanged.

Report the query scope, findings, timestamps, confidence, and material gaps. Include a direct encoded Datadog logs link or `https://app.datadoghq.com/apm/trace/<trace_id>` when useful. Absence from search is not proof that an event never occurred.
