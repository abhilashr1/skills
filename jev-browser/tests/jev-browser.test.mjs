import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BrowserError, allowedUrl, askJev, buildActions, createBrowser, httpUrl,
  main, makePayload, makeRedactor, normalizeHost, normalizeTabs, observe,
  parseArgs, prepareValues, prerequisiteReport, readPage, runController, runReadController, saveImage,
  validateDecision, validateImagePath,
} from "../scripts/jev-browser.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = "https://example.com";
const options = (...args) => ({ ...parseArgs(["--url", ORIGIN, "--goal", "Find the requested information", ...args]), session: "isolated", model: "jev-latest" });
const readOptions = (...args) => ({ ...parseArgs(["--mode", "read", "--url", ORIGIN, ...args]), session: "isolated" });
const authorized = (...args) => options("--allow-risky", "--authorization", "Perform only the requested effect", ...args);
const decision = (choice = "finish", completion = 0.95, confidence = 0.95) => ({ model: "jev-latest", answers: { objective_complete: { type: "noul", noul: completion }, next_action: { type: "choice", choice, confidence } } });

function world(overrides = {}) {
  const state = {
    url: ORIGIN, text: "Requested information", snapshot: "- heading \"Requested information\"", refs: {},
    tabs: [{ targetId: "target-a", active: true, url: ORIGIN, title: "Information" }], ...overrides,
  };
  const calls = [];
  const browser = command => {
    calls.push(command);
    if (command[0] === "tab" && command[1] === "list") return structuredClone({ tabs: state.tabs });
    if (command[0] === "get" && command[1] === "url") return { url: state.url };
    if (command[0] === "get" && command[1] === "text") return { text: state.text };
    if (command[0] === "get" && command[1] === "title") return { title: state.tabs.find(tab => tab.active)?.title ?? "" };
    if (command[0] === "snapshot") return { snapshot: state.snapshot, refs: structuredClone(state.refs) };
    if (command[0] === "tab") {
      for (const tab of state.tabs) tab.active = tab.targetId === command[1];
      state.url = state.tabs.find(tab => tab.active).url;
    }
    if (command[0] === "click" && command.includes("--new-tab")) state.tabs.push({ targetId: "target-b", active: false, url: ORIGIN, title: "Second information page" });
    return {};
  };
  return { state, calls, browser };
}

async function control(opts = options(), w = world(), ask = async () => decision(), extra = {}) {
  return runController(opts, { browser: w.browser, ask, values: new Map(), specs: [], redact: value => value, ...extra });
}

async function readControl(opts, w = world(), extra = {}) {
  return runReadController(opts, { browser: w.browser, redact: value => value, ...extra });
}

function mockSpawn(w = world(), hook) {
  const calls = [];
  const spawn = (executable, args, config) => {
    calls.push({ executable, args, config });
    const override = hook?.(executable, args, config);
    if (override) return override;
    if (args.includes("--version")) return { status: 0, stdout: "agent-browser 0.38.1", stderr: "" };
    if (args.includes("--help")) return { status: 0, stdout: "batch --allowed-domains", stderr: "" };
    const command = JSON.parse(config.input)[0];
    return { status: 0, stdout: JSON.stringify([{ command, success: true, result: w.browser(command) }]), stderr: "" };
  };
  return { calls, spawn };
}

const secretEnv = () => ({ TYPESAFE_API_KEY: randomUUID(), SITE_VALUE: randomUUID() });

// Policy and parsing are deliberately independent of browsers and credentials.
test("exact host policy is additive, case-normalized and never implicit for a resume", () => {
  const opts = options("--allowed-domain", "OTHER.EXAMPLE");
  assert.deepEqual(opts.allowedDomains, ["other.example", "example.com"]);
  assert.equal(allowedUrl("https://sub.example.com", opts), false);
  assert.equal(allowedUrl("https://example.com.other.example", opts), false);
  assert.equal(allowedUrl("https://example.com:8443/path", opts), true);
  assert.throws(() => parseArgs(["--session", "isolated", "--goal", "Read information"]), /allowlist/);
  assert.throws(() => options("--no-domain-restriction"), /Unknown/);
});

test("read mode is explicit, bounded and excludes Jev effects and values", () => {
  const opts = readOptions("--read-limit", "1200");
  assert.equal(opts.mode, "read");
  assert.equal(opts.readLimit, 1200);
  assert.equal(opts.goal, undefined);
  assert.throws(() => readOptions("--goal", "Extract information"), /decide mode/);
  assert.throws(() => readOptions("--value", "topic=text"), /Read mode/);
  assert.throws(() => readOptions("--allow-risky", "--authorization", "Click links"), /Read mode/);
  assert.throws(() => readOptions("--save-image", "image.png"), /Read mode/);
  assert.throws(() => readOptions("--read-limit", "999"), /read-limit/);
  assert.throws(() => parseArgs(["--mode", "other", "--url", ORIGIN]), /mode/);
});

test("reject malformed URLs, credentials in URLs and wildcard domains", () => {
  for (const url of ["about:blank", "chrome-error://page", "data:text/plain,x", "file:document", "https://", "https://example.com\\@other.example", "https://a:b@example.com", "https://example.com/ bad"]) assert.equal(httpUrl(url), null);
  for (const host of ["*.example.com", "example.com,other.example", "https://example.com", "example.com:443", "example.com/path", "example.com.", "-example.com", ""]) assert.throws(() => normalizeHost(host));
});

test("validate bounds, duplicates, reserved secret sources and authorization pairing", () => {
  for (const args of [
    ["--max-steps", "NaN"], ["--max-steps", "0"], ["--confidence", "0"], ["--confidence", "Infinity"],
    ["--complete-threshold", "1.1"], ["--allow-risky"], ["--authorization", "An effect"],
    ["--session", "../escape"], ["--value", "password=not-allowed"],
    ["--value", "item=x", "--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com"],
    ["--value", "item=x", "--value", "item=y"], ["--value-label", "missing=label"],
    ["--value-env", "item=SITE_VALUE"],
    ["--value-env", "item=TYPESAFE_API_KEY", "--value-domain", "item=example.com"],
    ["--value-env", "item=SITE_VALUE", "--value-domain", "item=other.example"],
    ["--save-image", "image.jpg"],
  ]) assert.throws(() => options(...args));
});

test("secret values require a nonempty environment source and cannot accompany image saving", () => {
  const opts = options("--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com");
  assert.throws(() => prepareValues(opts, {}), /missing/);
  assert.throws(() => options("--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com", "--save-image", "image.png"));
});

test("secret field candidates exist only on their exact HTTPS destination", () => {
  const opts = options("--allowed-domain", "other.example", "--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com");
  const { specs } = prepareValues(opts, secretEnv());
  for (const [url, expected] of [[ORIGIN, true], ["http://example.com", false], ["https://other.example", false]]) {
    const snap = { url, snapshot: "field", tabs: [], refs: { e1: { role: "textbox", name: "Account field" } } };
    assert.equal(buildActions(opts, snap, specs).some(action => action.kind === "fill"), expected);
  }
});

test("bounded actions ignore invalid and disabled refs; ordinary content reaches Jev", () => {
  const opts = options("--value", "topic=Useful text");
  const { specs, redact } = prepareValues(opts, {});
  const refs = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`e${i}`, { role: "button", name: "Navigation" }]));
  const snapshot = { ...world().state, tab: "target-a", refs: { injected: { role: "button" }, e999: { role: "button", disabled: true }, ...refs } };
  const actions = buildActions(opts, snapshot, specs);
  assert.equal(actions.length, 250);
  assert.equal(new Set(actions.map(action => action.id)).size, actions.length);
  assert.ok(!actions.some(action => action.ref === "injected" || action.ref === "@e999"));
  const payload = makePayload(opts, snapshot, actions, [], specs, redact);
  assert.equal(payload.state.supplied_values[0].content, "Useful text");
});

test("known secret echoes are redacted across complete payloads and common encodings", () => {
  const env = secretEnv();
  const opts = options("--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com");
  const { specs, redact } = prepareValues(opts, env);
  const snapshot = { ...world().state, title: env.SITE_VALUE, url: `${ORIGIN}/?token=${env.SITE_VALUE}`, refs: { e1: { role: "textbox", name: env.SITE_VALUE, value: env.SITE_VALUE } }, snapshot: `${env.SITE_VALUE} ${encodeURIComponent(env.SITE_VALUE)} ${Buffer.from(env.SITE_VALUE).toString("base64")} ${env.TYPESAFE_API_KEY}` };
  const payload = makePayload(opts, snapshot, buildActions(opts, snapshot, specs), [], specs, redact);
  const encoded = JSON.stringify(payload);
  for (const secret of Object.values(env)) assert.ok(!encoded.includes(secret));
  assert.equal(payload.state.browser.url, `${ORIGIN}/`);
  assert.equal(payload.state.supplied_values[0].content, undefined);
  assert.ok(encoded.includes("[REDACTED]"));
  assert.equal(makeRedactor(["special + value"])(encodeURIComponent("special + value")), "[REDACTED]");
});

test("same-URL tabs retain distinct stable identities and disallowed tabs are hidden", () => {
  const snapshot = { ...world().state, tabs: normalizeTabs({ tabs: [
    { tabId: "t1", targetId: "target-a", active: true, url: ORIGIN },
    { tabId: "t2", targetId: "target-b", active: false, url: ORIGIN },
    { tabId: "t3", targetId: "target-c", active: false, url: "https://other.example" },
  ] }) };
  const actions = buildActions(options(), snapshot, []);
  assert.deepEqual(actions.filter(action => action.kind === "switch_tab").map(action => action.tab), ["target-b"]);
  assert.throws(() => normalizeTabs({ tabs: [{ id: 0, active: true }] }), /stable/);
  assert.throws(() => normalizeTabs({ tabs: [{ id: "t1" }, { id: "t2" }] }), /ambiguous/);
});

test("malformed model responses cannot become executable or completion decisions", () => {
  const actions = [{ id: "finish", kind: "finish" }];
  for (const value of [NaN, Infinity, -0.1, 1.1, "0.9"]) {
    assert.throws(() => validateDecision(decision("finish", value), actions));
    assert.throws(() => validateDecision(decision("finish", 0.9, value), actions));
  }
  assert.throws(() => validateDecision(decision("invented"), actions), /unknown/);
  assert.throws(() => validateDecision({ ...decision(), model: "other-planner" }, actions), /model/);
  assert.throws(() => validateDecision({ answers: {} }, actions));
});

test("read mode returns bounded untrusted text without refs or a TypeSafe decision", async () => {
  const w = world({ text: `Headline one\n${"x".repeat(1400)}` });
  const opts = readOptions("--read-limit", "1000");
  const page = readPage(opts, w.browser);
  assert.equal(page.text.length, 1000);
  assert.equal(page.truncated, true);
  const result = await readControl(opts, w);
  assert.equal(result.status, "completed");
  assert.equal(result.mode, "read");
  assert.equal(result.content.untrusted, true);
  assert.equal(result.content.truncated, true);
  assert.match(result.content.text, /Headline one/);
  assert.ok(!result.content.text.includes("@e"));
  assert.ok(!w.calls.some(command => command[0] === "snapshot"));
  assert.equal(w.calls.at(-1)[0], "close");
});

test("read mode reobserves races, redacts known secrets and supports mixed-session continuation", async () => {
  const secret = randomUUID();
  const w = world({ text: `Public result ${secret}` });
  let changed = false;
  const browser = command => {
    const result = w.browser(command);
    if (!changed && command[0] === "get" && command[1] === "text") {
      changed = true;
      w.state.tabs[0].title = "Updated information";
    }
    return result;
  };
  const opts = readOptions("--keep-open");
  const result = await runReadController(opts, { browser, redact: makeRedactor([secret]) });
  assert.equal(result.status, "completed");
  assert.match(result.content.text, /\[REDACTED\]/);
  assert.equal(w.calls.filter(command => command[0] === "get" && command[1] === "text").length, 2);
  assert.ok(!w.calls.some(command => command[0] === "close"));
});

test("empty readable pages fail closed", async () => {
  const result = await readControl(readOptions(), world({ text: "  \n" }));
  assert.equal(result.status, "needs_guidance");
  assert.match(result.reason, /no readable/);
});

test("completion requires stable permitted page and BOTH Choice and Noul gates", async () => {
  for (const [choice, completion, confidence, status] of [
    ["finish", 0.95, 0.95, "completed"], ["finish", 0.1, 0.95, "needs_guidance"],
    ["finish", 0.95, 0.1, "needs_guidance"], ["blocked", 1, 1, "needs_guidance"],
  ]) {
    const w = world();
    const result = await control(options(), w, async () => decision(choice, completion, confidence));
    assert.equal(result.status, status);
    assert.equal(w.calls.at(-1)[0], "close");
    assert.ok(!JSON.stringify(result).includes("Requested information"));
  }
});

test("empty snapshots and invalid completion URLs never complete", async () => {
  for (const url of ["about:blank", "chrome-error://page", "https://", "https://other.example"]) {
    const w = world({ url, tabs: [{ targetId: "target-a", active: true, url }] });
    const result = await control(options(), w);
    assert.notEqual(result.status, "completed");
    assert.ok(!w.calls.some(command => command[0] === "snapshot"));
  }
  assert.notEqual((await control(options(), world({ snapshot: "" }))).status, "completed");
});

test("default deny catches innocuous labels as well as consequential ones", async () => {
  for (const role of ["button", "link", "checkbox", "textbox"]) {
    const w = world({ refs: { e1: { role, name: "Continue" } } });
    const choice = role === "textbox" ? "fill_e1_topic" : "act_e1";
    const opts = options("--value", "topic=Text");
    const prepared = prepareValues(opts, {});
    const result = await control(opts, w, async () => decision(choice, 0), prepared);
    assert.equal(result.status, "confirmation_required");
    assert.ok(!w.calls.some(command => ["fill", "click", "check"].includes(command[0])));
  }
});

test("Jev-selected new-tab action is followed by a Jev-selected same-URL tab switch", async () => {
  const w = world({ refs: { e1: { role: "link", name: "Information" } } });
  const choices = ["act_e1", "tab_1", "finish"];
  let count = 0;
  const result = await control(authorized("--links-new-tab"), w, async payload => {
    const choice = choices[count++];
    assert.ok(choice in payload.questions.next_action.criteria);
    return decision(choice, choice === "finish" ? 1 : 0);
  });
  assert.equal(result.status, "completed");
  assert.ok(w.calls.some(command => command.join(" ") === "click @e1 --new-tab"));
  assert.ok(w.calls.some(command => command.join(" ") === "tab target-b"));
  assert.equal(w.state.tabs.find(tab => tab.active).targetId, "target-b");
});

test("blank tab recovery selects another permitted tab without reading blank content", async () => {
  const w = world({ url: "about:blank", tabs: [
    { targetId: "target-a", active: true, url: "about:blank" },
    { targetId: "target-b", active: false, url: ORIGIN },
  ] });
  let count = 0;
  const result = await control(options(), w, async () => decision(count++ ? "finish" : "tab_1"));
  assert.equal(result.status, "completed");
  assert.ok(w.calls.findIndex(command => command[0] === "snapshot") > w.calls.findIndex(command => command.join(" ") === "tab target-b"));
});

test("changed snapshot after inference discards the decision and asks Jev again", async () => {
  const w = world({ refs: { e1: { role: "button", name: "Old" } } });
  let count = 0;
  const result = await control(authorized(), w, async () => {
    if (count++ === 0) {
      w.state.refs = { e2: { role: "button", name: "New" } };
      w.state.snapshot = "New state";
      return decision("act_e1", 0);
    }
    return decision();
  });
  assert.equal(result.status, "completed");
  assert.equal(count, 2);
  assert.equal(result.steps[0].action, "reobserve");
  assert.ok(!w.calls.some(command => command[0] === "click"));
});

test("tab/URL mismatch during observation fails closed before snapshots", () => {
  const w = world({ tabs: [{ targetId: "target-a", active: true, url: `${ORIGIN}/different` }] });
  assert.throws(() => observe(options(), w.browser), error => error.code === "stale_ref");
  assert.ok(!w.calls.some(command => command[0] === "snapshot"));
});

test("explicit stale errors reobserve at most twice; ambiguous effects never retry", async () => {
  for (const code of ["stale_ref", "browser_error", "confirmation_required"]) {
    const w = world({ refs: { e1: { role: "button", name: "An effect" } } });
    let executions = 0;
    const browser = command => {
      if (command[0] === "click") {
        executions++;
        throw new BrowserError("Stopped", code);
      }
      return w.browser(command);
    };
    const result = await control(authorized(), w, async () => decision("act_e1", 0), { browser });
    assert.equal(executions, code === "stale_ref" ? 3 : 1);
    assert.equal(result.status, code === "confirmation_required" ? "confirmation_required" : "needs_guidance");
  }
});

test("semantic repeat and iteration limits stop without hidden browser fallback", async () => {
  const w = world();
  const loop = await control(options(), w, async () => decision("wait", 0));
  assert.equal(loop.status, "needs_guidance");
  assert.match(loop.reason, /loop/);
  assert.equal(w.calls.filter(command => command[0] === "wait").length, 2);
  const limited = await control(options("--max-steps", "1"), world(), async () => decision("wait", 0));
  assert.equal(limited.status, "max_steps");
});

test("cleanup failures do not replace results; keep-open skips close", async () => {
  const w = world();
  const browser = command => { if (command[0] === "close") throw new BrowserError("Close failed"); return w.browser(command); };
  const result = await control(options(), w, async () => decision(), { browser });
  assert.equal(result.status, "completed");
  assert.match(result.cleanupWarning, /close failed/);
  const kept = world();
  assert.equal((await control(options("--keep-open"), kept)).status, "completed");
  assert.ok(!kept.calls.some(command => command[0] === "close"));
});

test("API adapter fixes the endpoint, rejects redirects, retries only 429/529", async () => {
  const calls = [];
  const sleeps = [];
  const env = secretEnv();
  const response = await askJev({ model: "jev-latest" }, env.TYPESAFE_API_KEY, {
    fetchImpl: async (url, config) => {
      calls.push({ url, config });
      return calls.length < 3 ? new Response("busy", { status: calls.length === 1 ? 429 : 529 }) : Response.json(decision());
    }, sleep: async ms => { sleeps.push(ms); },
  });
  assert.equal(response.model, "jev-latest");
  assert.deepEqual(sleeps, [500, 1000]);
  for (const call of calls) {
    assert.equal(call.url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(call.config.redirect, "error");
    assert.equal(call.config.headers.Authorization, `Bearer ${env.TYPESAFE_API_KEY}`);
  }
  for (const status of [400, 401, 500]) {
    let count = 0;
    await assert.rejects(askJev({}, env.TYPESAFE_API_KEY, { fetchImpl: async () => { count++; return new Response(env.TYPESAFE_API_KEY, { status }); } }), error => !error.message.includes(env.TYPESAFE_API_KEY));
    assert.equal(count, 1);
  }
});

test("API adapter bounds retries and malformed/oversized/error responses", async () => {
  let count = 0;
  await assert.rejects(askJev({}, "", { fetchImpl: async () => { count++; return new Response("busy", { status: 429 }); }, sleep: async () => {} }), /429/);
  assert.equal(count, 4);
  await assert.rejects(askJev({}, "", { fetchImpl: async () => new Response("not JSON") }), /invalid JSON/);
  await assert.rejects(askJev({}, "", { fetchImpl: async () => new Response("x".repeat(1024 * 1024 + 1)) }), /limits/);
  await assert.rejects(askJev({}, "", { fetchImpl: async () => { throw new Error("untrusted details"); } }), error => !error.message.includes("untrusted"));
});

test("secret fills use JSON stdin, stripped child environment, and no shell", () => {
  const env = { ...secretEnv(), AGENT_BROWSER_BIN: "browser launcher.mjs" };
  const opts = options("--value-env", "item=SITE_VALUE", "--value-domain", "item=example.com");
  const mocked = mockSpawn();
  const browser = createBrowser(opts, env, mocked.spawn, "win32");
  browser(["fill", "@e1", env.SITE_VALUE]);
  const call = mocked.calls[0];
  assert.equal(call.args[0], "browser launcher.mjs");
  assert.ok(!call.args.join(" ").includes(env.SITE_VALUE));
  assert.equal(JSON.parse(call.config.input)[0][2], env.SITE_VALUE);
  assert.equal(call.config.env.TYPESAFE_API_KEY, undefined);
  assert.equal(call.config.env.SITE_VALUE, undefined);
  assert.equal(call.config.shell, false);
  assert.equal(call.config.windowsHide, true);
  assert.ok(call.config.timeout > 0);
  assert.ok(call.args.includes("--allowed-domains"));
});

test("Windows native launch and unsafe shell-shim rejection", () => {
  const mocked = mockSpawn();
  createBrowser(options(), {}, mocked.spawn, "win32").check();
  assert.equal(mocked.calls[0].executable, "agent-browser.exe");
  assert.throws(() => createBrowser(options(), { AGENT_BROWSER_BIN: "agent-browser.cmd" }, mocked.spawn, "win32"), /shell shim/);
});

test("subprocess error/confirmation handling never reflects raw command or output", () => {
  const secret = randomUUID();
  for (const row of [
    { success: false, code: "invalid_ref", error: secret },
    { success: true, result: { confirmation_required: true, description: secret } },
    { success: false, error: secret },
  ]) {
    const browser = createBrowser(options(), {}, () => ({ status: row.success ? 0 : 1, stdout: JSON.stringify([row]), stderr: secret }));
    assert.throws(() => browser(["fill", "@e1", secret]), error => !error.message.includes(secret) && error instanceof BrowserError);
  }
  const browser = createBrowser(options(), {}, () => ({ status: 1, stdout: secret, stderr: secret }));
  assert.throws(() => browser(["snapshot"]), error => !error.message.includes(secret));
});

test("prerequisite diagnostics report only mode-relevant requirements", () => {
  const report = prerequisiteReport({}, { check() { throw new Error("private details"); } });
  assert.equal(report.ok, false);
  const text = JSON.stringify(report);
  assert.match(text, /npm install -g agent-browser/);
  assert.match(text, /TYPESAFE_API_KEY/);
  assert.match(text, /unverified/);
  assert.ok(!text.includes("private details"));
  const readReport = prerequisiteReport({}, { check() { return "0.38.1"; } }, { requireApi: false });
  assert.equal(readReport.ok, true);
  assert.ok(!JSON.stringify(readReport).includes("TYPESAFE_API_KEY"));
});

test("--check is network-free, browser-free, sanitized and useful for missing prerequisites", async () => {
  for (const env of [{}, secretEnv(), { ...secretEnv(), TYPESAFE_API_URL: "https://other.example" }, { ...secretEnv(), TYPESAFE_MODEL: "other-planner" }]) {
    const mocked = mockSpawn();
    const emitted = [];
    const code = await main(["--check"], { env, spawn: mocked.spawn, fetchImpl: () => assert.fail("network must not run"), emit: value => emitted.push(value) });
    assert.equal(code, env.TYPESAFE_API_KEY && !env.TYPESAFE_API_URL && !env.TYPESAFE_MODEL ? 0 : 1);
    assert.ok(mocked.calls.every(call => call.args.includes("--version") || call.args.includes("--help")));
    assert.ok(!JSON.stringify(emitted).includes(env.TYPESAFE_API_KEY ?? "absent-secret-marker"));
    assert.ok(emitted[0].checks.some(check => check.name === "browser-binary" && check.status === "unverified"));
  }
});

test("missing, outdated and incapable CLI versions fail before network or navigation", async () => {
  for (const kind of ["missing", "old", "incapable"]) {
    const mocked = mockSpawn(world(), (_bin, args) => {
      if (kind === "missing") return { error: new Error("private process error") };
      if (kind === "old" && args.includes("--version")) return { status: 0, stdout: "agent-browser 0.1.0" };
      if (kind === "incapable" && args.includes("--help")) return { status: 0, stdout: "basic commands" };
    });
    const emitted = [];
    const code = await main(["--url", ORIGIN, "--goal", "Read information"], { env: secretEnv(), spawn: mocked.spawn, fetchImpl: () => assert.fail("network must not run"), emit: value => emitted.push(value) });
    assert.equal(code, 1);
    assert.equal(emitted[0].status, "error");
    assert.ok(!mocked.calls.some(call => call.config.input));
    assert.ok(!JSON.stringify(emitted).includes("private process error"));
  }
});

test("missing browser binary produces actionable startup error and cleanup without target navigation", async () => {
  const w = world();
  const mocked = mockSpawn(w, (_bin, _args, config) => config.input && JSON.parse(config.input)[0][0] === "open" ? { status: 1, stdout: JSON.stringify([{ success: false, error: "browser missing" }]) } : undefined);
  const emitted = [];
  const code = await main(["--url", ORIGIN, "--goal", "Read information"], { env: secretEnv(), spawn: mocked.spawn, fetchImpl: () => assert.fail("no API call"), emit: value => emitted.push(value) });
  assert.equal(code, 1);
  assert.match(emitted[0].reason, /agent-browser install/);
  assert.ok(!mocked.calls.some(call => call.config.input && JSON.parse(call.config.input)[0][1] === ORIGIN));
  assert.equal(w.calls.at(-1)[0], "close");
});

test("mocked read-mode CLI run returns content without an API key or TypeSafe request", async () => {
  const w = world({ text: "Five public headlines are visible" });
  const mocked = mockSpawn(w);
  const emitted = [];
  const code = await main(["--mode", "read", "--url", ORIGIN], {
    env: {}, spawn: mocked.spawn, emit: value => emitted.push(value),
    fetchImpl: () => assert.fail("read mode must not call TypeSafe"),
  });
  assert.equal(code, 0);
  assert.equal(emitted[0].status, "completed");
  assert.equal(emitted[0].content.text, "Five public headlines are visible");
  assert.ok(!mocked.calls.some(call => call.args.includes("snapshot")));
});

test("mocked end-to-end CLI run covers prerequisite probes, API, completion and cleanup", async () => {
  const w = world();
  const mocked = mockSpawn(w);
  const emitted = [];
  let requests = 0;
  const code = await main(["--url", ORIGIN, "--goal", "Read information"], {
    env: secretEnv(), spawn: mocked.spawn, emit: value => emitted.push(value),
    fetchImpl: async (_url, config) => { requests++; assert.ok(JSON.parse(config.body).questions.next_action.criteria.finish); return Response.json(decision()); },
  });
  assert.equal(code, 0);
  assert.equal(requests, 1);
  assert.equal(emitted[0].status, "completed");
  assert.deepEqual(w.calls.slice(0, 2), [["open"], ["open", ORIGIN]]);
  assert.equal(w.calls.at(-1)[0], "close");
});

test("mocked end-to-end credential routing never exposes secret echoes to Jev or results", async () => {
  const env = secretEnv();
  const w = world({ refs: { e1: { role: "textbox", name: "Account value" } } });
  const originalBrowser = w.browser;
  w.browser = command => {
    if (command[0] === "fill") {
      assert.equal(command[2], env.SITE_VALUE);
      w.state.snapshot = `Account accepted ${env.SITE_VALUE}`;
      w.state.refs.e1.value = env.SITE_VALUE;
    }
    return originalBrowser(command);
  };
  const mocked = mockSpawn(w);
  const emitted = [];
  let requests = 0;
  const code = await main([
    "--url", ORIGIN, "--goal", "Use the supplied account value", "--allow-risky", "--authorization", "Enter the supplied account value at the permitted destination",
    "--value-env", "account=SITE_VALUE", "--value-domain", "account=example.com",
  ], {
    env, spawn: mocked.spawn, emit: value => emitted.push(value),
    fetchImpl: async (_url, config) => {
      assert.ok(!config.body.includes(env.SITE_VALUE));
      assert.ok(!config.body.includes(env.TYPESAFE_API_KEY));
      return Response.json(requests++ ? decision() : decision("fill_e1_account", 0));
    },
  });
  assert.equal(code, 0);
  assert.equal(requests, 2);
  for (const value of Object.values(env)) assert.ok(!JSON.stringify(emitted).includes(value));
  for (const call of mocked.calls) {
    assert.equal(call.config.env.SITE_VALUE, undefined);
    assert.equal(call.config.env.TYPESAFE_API_KEY, undefined);
    assert.ok(!call.args.join(" ").includes(env.SITE_VALUE));
  }
});

test("resume requires no startup navigation and retains explicit session state", async () => {
  const w = world();
  const opts = { ...parseArgs(["--session", "isolated", "--allowed-domain", "example.com", "--goal", "Read existing information"]), model: "jev-latest" };
  assert.equal((await control(opts, w)).status, "completed");
  assert.ok(!w.calls.some(command => command[0] === "open"));
});

test("sanitized API failures remain actionable without raw response bodies", async () => {
  const w = world();
  const result = await control(options(), w, () => askJev({}, "", { fetchImpl: async () => new Response("private response detail", { status: 401 }) }));
  assert.equal(result.status, "error");
  assert.match(result.reason, /HTTP 401/);
  assert.ok(!JSON.stringify(result).includes("private response detail"));
});

async function imageDirectory(fn) {
  const directory = await mkdtemp(path.join(HERE, ".image-test-"));
  try { await fn(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

test("image saving uses only the selected ref, validates PNG and never overwrites", async () => {
  await imageDirectory(async directory => {
    const output = path.join(directory, "selected.png");
    assert.equal(await validateImagePath(output), output);
    let calls = 0;
    await saveImage(command => {
      calls++;
      assert.equal(command[0], "screenshot");
      assert.equal(command[1], "@e8");
      // Intentionally omit the capture to exercise failure cleanup.
      return command;
    }, { ref: "@e8" }, output).then(() => assert.fail("missing capture must fail"), () => {});
    assert.equal(calls, 1);
    assert.deepEqual(await readdir(directory), []);
    await writeFile(output, "original");
    await assert.rejects(validateImagePath(output), /new PNG/);
    await assert.rejects(saveImage(() => assert.fail("must not screenshot"), { ref: "@e8" }, output), /not overwritten/);
    assert.equal(await readFile(output, "utf8"), "original");
  });
});

test("image writer validates and copies PNG; invalid captures clean up", async () => {
  const { writeFileSync } = await import("node:fs");
  await imageDirectory(async directory => {
    const output = path.join(directory, "selected.png");
    await saveImage(command => writeFileSync(command[2], PNG), { ref: "@e2" }, output);
    assert.deepEqual(await readFile(output), PNG);
    assert.deepEqual(await readdir(directory), ["selected.png"]);
    await rm(output);
    await assert.rejects(saveImage(command => writeFileSync(command[2], "not PNG"), { ref: "@e2" }, output));
    assert.deepEqual(await readdir(directory), []);
  });
});

test("image destinations reject symlinks without replacing their targets", async t => {
  await imageDirectory(async directory => {
    const target = path.join(directory, "original.png");
    const output = path.join(directory, "selected.png");
    await writeFile(target, "original");
    try { await symlink(target, output); } catch (error) { if (["EPERM", "EACCES"].includes(error.code)) { t.skip("Symlink creation is unavailable to this account"); return; } throw error; }
    await assert.rejects(validateImagePath(output));
    await assert.rejects(saveImage(() => assert.fail("must not screenshot"), { ref: "@e2" }, output));
    assert.equal(await readFile(target, "utf8"), "original");
  });
});

test("image mode cannot finish via Noul alone and completes only after selected capture", async () => {
  const w = world({ refs: { e1: { role: "img", name: "Relevant illustration" } } });
  let saved = false;
  const result = await control(options("--save-image", "selected.png"), w, async payload => {
    assert.equal(payload.questions.next_action.criteria.finish, undefined);
    return decision("save_e1", 0);
  }, { imageWriter: async (_browser, action) => { saved = true; assert.equal(action.ref, "@e1"); } });
  assert.equal(saved, true);
  assert.equal(result.status, "completed");
  assert.equal(result.imageSaved, true);
});
