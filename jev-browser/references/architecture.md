# Controller architecture

## Decision and execution contract

The supervisor supplies semantic goals and values, not refs, selectors, action lists or scripts. The controller uses only deterministic `agent-browser` commands. It never invokes `agent-browser chat`, another generative planner, page-provided code, or a shell.

Each bounded decision iteration:

1. Read stable tab identities and the active URL; reject disallowed/non-HTTP(S) content before reading its snapshot. `about:blank` permits only wait, blocked, or switching to a permitted tab.
2. Obtain a compact accessibility snapshot and recheck URL/tab inventory for observation races.
3. Enumerate at most **250** typed actions: finish/blocked/wait, permitted tab switches, scrolling/back, valid `e<number>` ref activations, field/value pairs, and optional image saving. Disabled refs are omitted. Full page text is capped at **18,000 characters** for inference; descriptions and values are separately bounded.
4. Ask Jev one **Choice** over those exact records and one **Noul** for visible completion. Ordinary supplied values include their content; environment-backed values include only semantic metadata. Apply known-secret redaction to the complete payload.
5. Validate model/answer types, finite probabilities in `[0,1]`, and membership in the current candidate set. Re-observe and compare the complete observation fingerprint before accepting either an action or completion.
6. Apply confidence, completion, authorization, repeated-action and iteration gates. Only a high-confidence `finish` **and** a completion Noul above threshold can finish a non-image task; completion also requires a nonempty snapshot on a permitted HTTP(S) URL.
7. Execute exactly the stored action through a one-command JSON batch over stdin, then repeat. Image mode finishes only after Jev selects an image and bounded PNG saving succeeds.

Default Choice confidence is **0.55**; completion threshold is **0.82**; maximum decision iterations are **20** (configurable 1–100). Three equivalent semantic actions in the recent four records trigger a loop stop. Freshness compares full raw snapshots/refs and tab inventory, not only the truncated model context. Stale observations or explicit CLI error codes `stale_ref`, `invalid_ref`, `ref_not_found`, and `tab_gone` discard the decision and consume an iteration, with at most two recoveries per run. Other action failures stop because execution may already have occurred. No ref is repaired or action replayed deterministically.

## Read contract

Read mode is a separate deterministic pipeline and never calls TypeSafe. It opens the user-supplied URL or resumes a dedicated session, checks stable tab identity and an allowed HTTP(S) URL, obtains body text through `agent-browser get text body`, reads the title, and then rechecks the URL and complete tab inventory. Explicit stale observations are retried at most twice.

The result contains bounded normalized text, title, original character count, truncation state, final origin, and an explicit untrusted-content marker. Control characters are stripped; refs, selectors, field values, URL paths, query strings and fragments are not returned. The default bound is 30,000 characters and the configurable maximum is 100,000. Empty text fails with `needs_guidance`.

Read mode rejects supplied values, environment-backed secrets, effect authorization and image output. Its text is intended for extraction, comparison and summarization by the invoking LLM. It cannot grant authorization or select the next browser element. A mixed workflow alternates read phases with decide phases in one named session; each decide phase receives only the next semantic outcome.

## Tabs and lifecycle

Tab identity prefers `targetId`, then `tabId`, then a validated string `id`; numeric indexes and ambiguous inventories fail closed. Exactly one tab must be active. Same-URL tabs remain separate options. Only permitted tabs are described to Jev. New tabs are discovered on the next iteration; switching remains a Jev decision, never a supervisor choice or an automatic guess.

Sessions have random names unless explicitly named. Startup probes a browser before opening the initial URL; resumed sessions preserve their state and are probed through observation. Sessions close in `finally` unless `--keep-open` was requested. Close failures become a cleanup warning, not a replacement for the original result. Separate dedicated sessions are essential: freshness checks are not a cross-process lock or atomic browser transaction.

## Trust boundaries

| Boundary | Deterministic enforcement / remaining trust |
| --- | --- |
| Model to executor | In decide mode, Choice lookup into current records; validated refs; no generated command or selector. Read mode has no model-selected execution. |
| Page to model | Decide mode sends untrusted bounded text to Jev. Read mode returns bounded non-actionable text to the invoking LLM. Both retain untrusted-data instructions and known-string redaction; prompt injection remains possible. |
| Page effects | All activations/fills require `--allow-risky` plus a semantic `--authorization`; this run-scoped grant cannot prove actual page behavior matches consent. |
| Network | Exact host allowlist passed to every browser batch; active URLs and tab candidates are checked again locally. Agent-browser must enforce redirects/subresources and reject incompatible configurations. No unrestricted option. |
| Credentials | Environment sources only, separately bound to an allowed HTTPS host, withheld from Jev, stripped from browser environment, transported in stdin. Destination pages and trusted local processes can still see them. |
| Output | Decide mode emits no raw subprocess/API errors, page labels/text, values, full URLs, or output paths. Read mode deliberately emits bounded title/body text marked untrusted, while still omitting refs, selectors, field values and full URLs. |
| Files | User-selected new PNG only; exclusive creation rejects existing files/symlinks. Screenshot goes to a private sibling staging directory, is size/header checked, copied through the reserved descriptor, and cleaned up. No original-image download. |

URL query strings/fragments are omitted from model-facing URL fields; known secret echoes are also scrubbed throughout payloads. Unknown secrets, arbitrary encodings, URL paths containing private data, and rendered image pixels cannot be reliably redacted. Do not use confidential pages without consent to share their observed contents with TypeSafe. Host restrictions do not prevent same-host exfiltration or effects, constrain ports, distinguish tenant accounts, or reliably identify the origin of a referenced subframe. Do not route sensitive credentials into untrusted or multi-origin content.

Agent-browser and its installation/configuration are trusted dependencies. The controller does not load shell profiles, credential stores or `.env` files, and does not auto-install packages. Prerequisite diagnostics probe version and basic CLI capabilities but cannot certify browser semantics or network containment. No doctor command is invoked automatically because it can inspect and modify local daemon/configuration state. See the README for setup and residual platform checks.

## External contracts

TypeSafe is used only by decide mode. Read mode neither requires an API key nor makes an API request.

TypeSafe request:

```http
POST https://api.typesafe.ai/v1/systemone
Content-Type: application/json
```

Authorization is supplied from `TYPESAFE_API_KEY` in memory. The model defaults to `jev-latest`; only `jev-*` names are accepted, including the response model. Requests reject redirects and have a 30-second timeout; only HTTP **429/529** retry, up to four attempts with exponential delay. Response reading is limited to 1 MiB. There is no endpoint override; tests inject an in-memory fetch implementation instead.

The CLI adapter requires agent-browser **0.38.1+** and basic batch/domain capabilities. Decide mode uses compact accessibility snapshots; read mode uses `get text body` plus stable URL/tab checks. It expects a one-row JSON batch array with `success`, `result`, and optional `code`; confirmations remain binding even on a successful transport. CLI calls are shell-free, have a 45-second process timeout and an 8 MiB output limit. A native executable or Node launcher supports Windows without shell escaping. OS error details and batch `command` echoes never leave the adapter.

Consult authoritative contracts before changing fields:

- [TypeSafe API](https://docs.typesafe.ai/api.md)
- [Choice](https://docs.typesafe.ai/primitives/choice.md) (255-option API maximum)
- [Function calling](https://docs.typesafe.ai/cookbooks/function_calling.md)
- [Confidence routing](https://docs.typesafe.ai/patterns/confidence-routing.md)
- [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)
- [agent-browser commands](https://github.com/vercel-labs/agent-browser#commands)

The test suite exercises these contracts with controlled fixtures, not live pages. See the README's validation section.
