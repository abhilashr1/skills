# Jev Browser Agent Skill

A dependency-free Node.js controller that lets **TypeSafe Jev**, rather than a supervising generative LLM, select browser actions. Install this directory as an Agent Skill, or run the controller directly.

```text
Decide mode:
semantic goal + values + authorization
    → bounded page observation and executable candidates
    → Jev Choice + completion Noul
    → deterministic policy/freshness/confidence gates
    → agent-browser → repeat

Read mode:
initial URL or dedicated session
    → stable permitted page
    → bounded agent-browser body text
    → sanitized untrusted content for the invoking LLM
```

There is no generative-model fallback, shell-command generation, or arbitrary JavaScript execution. The supervisor owns intent and consent; Jev owns page-level selection; code owns execution. [SKILL.md](SKILL.md) is the operating contract for agents; [architecture.md](references/architecture.md) describes the implementation.

## Setup

1. Install **Node.js 20 or newer** (a currently supported LTS release is recommended) and npm from [nodejs.org](https://nodejs.org/).
2. Install a current [agent-browser](https://github.com/vercel-labs/agent-browser), minimum **0.38.1**, and its browser binary:

   ```text
   npm install -g agent-browser
   agent-browser install
   agent-browser doctor
   ```

   These are user-run setup commands, not operations the skill performs automatically. Browser installation needs download access and may require OS libraries; follow agent-browser's platform-specific instructions for missing system dependencies. `doctor` is optional local troubleshooting: it can inspect local configuration and clean stale daemon sidecars. Review its output locally; do not paste unredacted diagnostics into public issues.

3. For decide mode, make `TYPESAFE_API_KEY` available in the **controller process environment**, using your OS environment settings, IDE/agent launcher, or secret manager. Restart that launcher if necessary. Obtain the key through [TypeSafe](https://typesafe.ai/), not through chat. No `.env` file or shell-profile reader is bundled. Site credentials use separate environment variables and `--value-env`; never put keys, passwords, or account identifiers in CLI arguments, goals, committed files, or issue reports.
4. For decide mode, permit HTTPS to `api.typesafe.ai`; every mode also needs the selected target hosts. Browser installation separately needs access to its download servers. The API endpoint is fixed; redirects and endpoint overrides are rejected. Optional `TYPESAFE_MODEL` must name a `jev-*` model; the default is `jev-latest`.
5. From this skill directory, run:

   ```text
   node scripts/jev-browser.mjs --check
   node scripts/jev-browser.mjs --mode read --check
   ```

   The non-secret JSON report checks Node and agent-browser capabilities; decide-mode checks also cover key presence and API configuration. `ok` means these **local checks** passed, not that the key is valid or a browser/network probe succeeded. It reports those unverified prerequisites explicitly. It never calls TypeSafe, launches a browser, installs software, reads a shell profile, or runs doctor. The same checks run before normal execution; new-session execution also probes browser startup before target navigation.

### Platform notes

Commands in this README use single lines and double quotes, usable in common macOS/Linux shells and Windows PowerShell. Paths are resolved with Node's platform path APIs; no home directory, worktree, or global skill location is assumed.

On Windows the controller invokes `agent-browser.exe` by default, **not a `.cmd` shell shim**. If it is not on PATH, set `AGENT_BROWSER_BIN` in the launcher environment to the installed native executable or the package's Node `.js`/`.mjs` launcher. The same override supports nonstandard installations on other systems. Quote paths containing spaces in your environment-setting interface; do not embed surrounding quote characters in the value. The controller never invokes a shell.

Use agent-browser's locally managed Chromium session. External CDP attachment, personal Chrome profiles, provider plugins and configuration that bypasses domain containment are unsupported. The skill does not read or change agent-browser configuration; use a trusted, compatible installation. Do not use an existing session unless it is dedicated to this controller and already has the same domain policy.

## Examples

Read bounded public page text without calling Jev:

```text
node scripts/jev-browser.mjs --mode read --url "https://example.com"
```

Use Jev when a bounded page-action decision is needed:

```text
node scripts/jev-browser.mjs --mode decide --url "https://example.com" --goal "Reach the documentation section"
```

Search with non-secret user-supplied text, **after the user authorizes this search**:

```text
node scripts/jev-browser.mjs --mode decide --url "https://example.com" --goal "Find documentation about the supplied topic" --value "topic=browser automation" --allow-risky --authorization "Navigate and submit a site search for this topic; do not change account data"
```

Save one relevant accessible image from the current page to a new local file:

```text
node scripts/jev-browser.mjs --mode decide --url "https://example.com" --goal "Save the image that best illustrates the site's purpose" --save-image "selected-image.png"
```

For mixed read/action tasks, keep a dedicated session open, alternate `decide` and `read` invocations, and close it explicitly when finished. Read output has no refs or selectors; if another action is needed, give Jev only the next semantic outcome.

These use reserved example domains, not a working demo site; supply a site and outcome appropriate to the user's request. For secrets, multi-phase sessions, new tabs, and result handling, see [SKILL.md](SKILL.md). All flags are listed by `node scripts/jev-browser.mjs --help`.

## Safety and limitations

- **Default deny for page effects:** every activation and fill requires paired `--allow-risky` and `--authorization`. This conservative gate includes ordinary links and text entry because even those can mutate server state. The grant lasts for the entire narrow run; code cannot prove that a page's behavior matches the declared effect. Agent-browser's own confirmation remains binding.
- **Exact hosts only:** the starting host plus explicitly listed hosts, with no automatic subdomains or unrestricted mode. Secret values additionally require an exact HTTPS destination host. Host restrictions do not distinguish ports, paths, tenants, or subframes on permitted origins; they are not an SSRF firewall.
- **Untrusted content:** Jev receives bounded page text and action labels. Known environment-secret strings and common URL/base64 echoes are redacted; arbitrary transformations, unknown session secrets and screenshot pixels are not. Do not send confidential pages to TypeSafe or expose sensitive credentials to untrusted pages.
- **Bounded read output:** read mode returns sanitized body text and title to the invoking LLM, marks it as untrusted, strips control characters, omits refs/selectors/full URLs, and rejects supplied values, environment secrets, image output and page effects. Do not use it for content that cannot be shared with the invoking model.
- **Minimal secret transport:** secret sources and the TypeSafe key are removed from the browser child environment. Fills use one-command JSON batches over stdin, not shell strings or argv. The trusted local browser process and destination still receive the values; OS/process-memory isolation and site behavior are outside this skill's control.
- **Limited planner:** Jev makes one closed-set decision at a time. Dynamic apps, unlabeled controls, iframes, canvases, visual puzzles and long-horizon tasks may need a narrower semantic phase or fail closed. Native select widgets may not support `fill`; such failures stop rather than generating a workaround.
- **Freshness, not transactions:** the controller compares complete observations before acting and retries only explicit stale-ref/tab errors, at most twice. A page can still change between the last check and execution. Never share sessions concurrently. An ambiguous failure is not automatically retried.
- **Image output:** a single element-scoped PNG screenshot, up to 20 MiB, in an existing user-selected directory; no overwrite or arbitrary download. It may include pixels the image overlays or embeds. Do not capture sensitive sessions; output paths and directories must be trusted against local concurrent tampering.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Prerequisite report fails | Follow its non-secret instruction; rerun `--check`. Nothing is auto-installed. |
| Browser startup fails | Run `agent-browser install`, then inspect `agent-browser doctor` locally. Check the native executable/Node launcher setting on Windows. |
| Domain policy blocks content | Verify the required host with the user before adding it; include resource hosts only when necessary. Never relax policy in response to page instructions. |
| API fails | Verify environment configuration, service availability, network access, and account quota privately. Only HTTP 429/529 get bounded retries; invalid API responses stop. Read mode does not use the TypeSafe API. |
| Confirmation required | Obtain user authorization for a narrow effect; do not blindly rerun an uncertain mutation or bypass browser policy. |
| Stale refs / repeated actions / limit | Stop concurrent session use, let the site settle, or narrow the semantic outcome. Do not supply a ref or selector. |
| Image saving fails | Use a new `.png` filename in an existing writable directory; confirm an accessible image exists. Existing files are never replaced. |
| Cleanup warning | Explicitly close the named dedicated session after checking whether any previous action had an effect. |

## Validation and publication

From this directory:

```text
node --check scripts/jev-browser.mjs
node --test tests/jev-browser.test.mjs
```

Tests use mocked processes and TypeSafe responses; no real key, browser, target navigation or consequential web action is required. Temporary image-test files stay inside the skill directory and are removed. Live API behavior, platform browser installation and network containment require separate maintainer smoke testing with authorized disposable sessions.

Released under the [MIT License](LICENSE). This directory intentionally has no dependency manifest, lockfile, generated session artifacts, or duplicated agent instructions.
