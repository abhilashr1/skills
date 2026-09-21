---
name: logs
description: Fetch and search CloudWatch logs for user-specified ECS services and Lambda functions. Use when asked to check logs, investigate errors, or trace requests.
---

# Fetch CloudWatch logs

Preserve the AWS profile, account, region, privacy, and query-limit boundaries supplied by the user or repository. Never assume a production account or region.

## Step 1: Resolve the log group

- Use a log group named by the user or documented in the current repository.
- For Lambda, the default convention is `/aws/lambda/<function-name>`.
- If the log group is unknown, list only the narrowest relevant prefix:

```bash
aws logs describe-log-groups \
  --region "<AWS_REGION>" \
  --log-group-name-prefix "<PREFIX>" \
  --query "logGroups[].logGroupName" \
  --output text
```

## Step 2: Convert time ranges

Convert user-specified times to UTC epoch milliseconds:

```bash
python3 -c "
from datetime import datetime, timezone
start = datetime(YYYY, M, D, H, m, s, tzinfo=timezone.utc)
end = datetime(YYYY, M, D, H, m, s, tzinfo=timezone.utc)
print(int(start.timestamp() * 1000))
print(int(end.timestamp() * 1000))
"
```

## Step 3: Query logs

### Filter by pattern

```bash
aws logs filter-log-events \
  --region "<AWS_REGION>" \
  --log-group-name "<LOG_GROUP>" \
  --start-time <START_MS> \
  --end-time <END_MS> \
  --filter-pattern '"<KEYWORD>"' \
  --limit 100
```

Useful filter patterns:

- `'"ERROR"'` or `'"error"'` — errors
- `'"<REQUEST_ID>"'` — exact request or correlation ID
- `'"POST"'` / `'"PATCH"'` / `'"DELETE"'` — mutations
- `'"term-a" "term-b"'` — both terms

### Read a specific stream

```bash
aws logs describe-log-streams \
  --region "<AWS_REGION>" \
  --log-group-name "<LOG_GROUP>" \
  --order-by LastEventTime --descending --limit 5

aws logs get-log-events \
  --region "<AWS_REGION>" \
  --log-group-name "<LOG_GROUP>" \
  --log-stream-name "<STREAM_NAME>" \
  --start-time <START_MS> \
  --limit 50
```

Run independent `filter-log-events` requests when the user asks for multiple log groups.

## Step 4: Present results

- Include UTC timestamps and log group or stream attribution.
- Highlight errors, warnings, and the requested terms.
- Redact credentials, session tokens, personal data, and sensitive payload fields.
- If no events are found, state the exact scope and suggest the smallest useful expansion.
- Do not claim complete counts from capped or paginated results.
