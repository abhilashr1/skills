---
name: local-ui-proof
description: "Produce reproducible, PR-ready visual evidence for a local web UI change: resolve the owning app and route, start the minimum local services, create safe disposable fixtures or mocks when needed, exercise the actual UI in the requested browser, verify the observed URL and visible assertion, capture a screenshot, stop temporary processes, and return a structured evidence record. Use when the user asks to test a change locally in a browser, prove a UI flow works, capture a screenshot for a pull request, or validate cross-application routing."
---

# Local UI Proof

Create browser evidence that another developer can understand and reproduce. Once the agreed assertions pass with current evidence, finish; add scenarios only for uncovered acceptance criteria or a concrete failure. Component-harness proof must be labeled as such and cannot pass a required authenticated-route or end-to-end contract. Test the real local UI; mock only unavailable backend boundaries.

## 1. Define the proof contract

Before starting services, record:

```yaml
source_app: <repository/app>
destination_app: <repository/app>
route_requested: <URL or path>
route_expected: <URL or path>
visible_assertion: <specific heading, label, state, or value>
browser: <user-requested or selected surface>
```

For cross-application routing, verify both the source action when practical and the destination route. If source authentication or data makes the source action impractical, verify the exact handoff URL and clearly state that limitation.

## 2. Preflight once

Before starting services or initializing the browser, perform one bounded discovery pass:

1. Resolve every in-scope app, route, dev command, port, environment variable, backend dependency, and applicable repository instruction together.
2. Check port availability and only the dependencies required to boot the selected apps. Prefer a focused repair over reinstalling the whole workspace, and verify it leaves no tracked changes.
3. Choose one fixture strategy in this order: existing fixture or seed, documented development authentication, then a disposable boundary mock. Define all required endpoints and request logging before implementing the mock.
4. For a cross-application source action that depends on difficult authentication or data, set a short fallback boundary before execution. Default to one complete setup attempt or roughly two minutes: if the source still cannot become interactive, verify the exact generated handoff URL and exercise that URL directly, then record the limitation.
5. Record the services, process identifiers, ports, and disposable paths that the run will own. Start independent services concurrently when safe.

Do not rediscover setup incrementally after each failure. Revise the chosen approach only when new evidence invalidates it.

## 3. Prepare the local environment

Reuse the completed preflight and any applicable project verification skill. Read only its setup and the feature under test; do not rerun a whole feature-map audit. One operator owns setup, driving, evidence, and cleanup through completion. Do not spawn another browser operator from inside this workflow.


1. Execute the preflighted setup; revisit it only when new evidence invalidates it.
2. Reuse an already-running suitable service when safe. Otherwise start the minimum services needed in inspectable long-running sessions.
3. Prefer existing fixtures, seed data, MSW handlers, or documented development authentication.
4. If backend state is unavailable, create the preflighted disposable mock outside the repository, expose only the endpoints required by the proof contract, use synthetic non-sensitive data, and log relevant request methods and paths from the start. Never point a disposable mock at production or commit it with the implementation.
5. Start independent mock and application services concurrently when safe, then confirm each expected port before opening the browser.
6. Initialize the selected browser once and reuse one binding and tab for the complete evidence sequence.

Do not expose credentials, tokens, private customer data, or sensitive browser state in fixtures, logs, URLs, or screenshots.

## 4. Exercise the actual UI

1. Use available Cursor browser tools or a browser-control skill. Honor an explicitly requested Chrome, Edge, or in-app browser; do not substitute another surface.
2. Navigate to the requested local route. Reload after relevant build changes when hot reload is unavailable or disabled.
3. Interact through visible UI controls when the proof contract includes a source action. Direct navigation is acceptable when the exact destination handoff is the subject of the proof or source setup is explicitly out of scope.
4. Keep the success path uninterrupted: perform the source action, observe the final URL, verify the visible assertion, collect preplanned request evidence, and capture the screenshot in that order within the same operator run.
5. Verify one authoritative URL signal and one authoritative visible UI signal. Capture evidence immediately once both are stable; do not pause for unrelated diagnostics or collect redundant evidence.
6. Inspect browser console errors only when they are relevant to the asserted behavior or the expected state failed.

If the expected state is not reached, diagnose enough to distinguish an implementation failure from fixture, authentication, or environment failure. Do not capture a success screenshot of a partially working state.

## 5. Capture the screenshot

1. Put the page into a stable, representative state with no loading indicators, transient menus, developer overlays, or unrelated sensitive data.
2. Use the browser screenshot capability. Capture the smallest viewport or full-page image that clearly proves the visible assertion.
3. Save it under the session visualization directory with a descriptive lowercase filename.
4. Verify the saved image visually when layout or readability matters.

## 6. Clean up

- Stop only temporary services started by this workflow.
- Remove only disposable artifacts created for this proof.
- Preserve pre-existing development servers, user browser tabs, repository fixtures, and implementation files.
- Finalize browser tabs according to the browser skill, keeping a tab only when it is a user-facing deliverable or handoff.
- Perform cleanup in the same operator run immediately after evidence capture. If the run is interrupted, resume cleanup from the recorded process identifiers and paths instead of repeating setup.

## 7. Return the evidence record

Return:

```yaml
route_requested: <actual URL or path tested>
route_observed: <final URL or path>
visible_assertion: <assertion that passed>
screenshot: <absolute path>
fixture: <existing fixture, disposable mock summary, or none>
request_evidence: <relevant methods/paths, or none>
limitations: <none or concise limitation>
cleanup: <stopped services and removed disposable paths>
```

Also report the local command or services used, whether temporary processes were stopped, and any browser-visible warnings relevant to the change. When a PR screenshot was requested, pass this record and its absolute screenshot path to `create-pr`.
