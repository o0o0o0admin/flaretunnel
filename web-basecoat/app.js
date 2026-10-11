"use strict";
/* FlareTunnel Basecoat panel — vanilla JS parity of web-next page.tsx + api.ts */
var API_BASE = "http://localhost:8081/api";

function refreshBasecoat() {
  try {
    if (window.basecoat && typeof window.basecoat.initAll === "function")
      window.basecoat.initAll({ force: true });
  } catch (e) {
    /* noop */
  }
}

async function request(path, options) {
  var res = await fetch(API_BASE + "/" + path, options);
  if (!res.ok) {
    var text = await res.text();
    throw new Error(text || "HTTP " + res.status);
  }
  return res.json();
}
function get(path) {
  return request(path);
}
function post(path, data) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
}
function del(path) {
  return request(path, { method: "DELETE" });
}

var api = {
  getAccounts: function () {
    return get("config/accounts");
  },
  addAccount: function (acc) {
    return post("config/accounts", acc);
  },
  deleteAccount: function (name) {
    return del("config/accounts?name=" + encodeURIComponent(name));
  },
  getWorkers: function () {
    return get("workers");
  },
  createWorkers: function (opts) {
    return post("workers/create", opts);
  },
  deleteWorker: function (name, account) {
    return post("workers/delete", { name: name, account: account });
  },
  testWorkers: function () {
    return post("workers/test", {});
  },
  getTunnelStatus: function () {
    return get("tunnel/status");
  },
  startTunnel: function (s) {
    return post("tunnel/start", s);
  },
  stopTunnel: function () {
    return post("tunnel/stop");
  },
  getTunnelConfig: function () {
    return get("tunnel/config");
  },
  saveTunnelConfig: function (c) {
    return post("tunnel/config", c);
  },
  getAnalytics: function () {
    return get("analytics");
  },
  getLogs: function () {
    return get("logs");
  },
};

/* State */
var state = {
  tab: "dashboard",
  accounts: [],
  workers: [],
  tunnel: null,
  totalReq: 0,
  logs: [],
  testResults: [],
  tests: null,
  pollId: null,
  workerAccount: "",
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg, type) {
  var el = document.getElementById("toaster");
  var category = type === "err" ? "error" : "success";
  try {
    if (el && typeof el.toast === "function") {
      el.toast({
        category: category,
        title: category === "error" ? "Error" : "Success",
        description: String(msg),
        duration: 3000,
      });
      return;
    }
  } catch (e) {
    /* fallback below */
  }
  var d = document.createElement("div");
  d.className = "btn";
  d.setAttribute("data-variant", type === "err" ? "destructive" : "default");
  d.textContent = String(msg);
  d.style.cssText = "position:fixed;bottom:1rem;right:1rem;z-index:9999;";
  document.body.appendChild(d);
  setTimeout(function () {
    d.remove();
  }, 3000);
}

function uptimeStr() {
  var u = (state.tunnel && state.tunnel.uptime) || 0;
  var h = Math.floor(u / 3600),
    m = Math.floor((u % 3600) / 60),
    s = u % 60;
  return h + "h " + m + "m " + s + "s";
}

function statusBadge() {
  var running = !!(state.tunnel && state.tunnel.running);
  return running
    ? '<span class="badge" data-variant="default"><i class="ri-checkbox-blank-circle-fill"></i> RUNNING</span>'
    : '<span class="badge" data-variant="outline"><i class="ri-checkbox-blank-circle-line"></i> STOPPED</span>';
}

function tunnelActionsHtml() {
  var running = !!(state.tunnel && state.tunnel.running);
  return (
    '<div class="flex gap-3 mt-4 flex-wrap">' +
    '<button class="btn" data-variant="default" data-action="start-tunnel"' +
    (running ? " disabled" : "") +
    '><i class="ri-play-line"></i> Start Tunnel</button>' +
    '<button class="btn" data-variant="destructive" data-action="stop-tunnel"' +
    (!running ? " disabled" : "") +
    '><i class="ri-stop-line"></i> Stop Tunnel</button></div>'
  );
}

function tunnelDetailHtml() {
  var t = state.tunnel;
  if (!(t && t.running)) return "";
  return (
    '<div class="text-sm text-muted-foreground mt-2">Port ' +
    esc(t.port) +
    " | Workers: " +
    esc(t.worker_count) +
    " | Rotation: " +
    esc(t.rotation) +
    " | Uptime: " +
    esc(uptimeStr()) +
    "</div>"
  );
}

/* Renderers (each ends with refreshBasecoat) */
function renderDashboard() {
  var running = !!(state.tunnel && state.tunnel.running);
  document.getElementById("stat-cards").innerHTML =
    statCard(
      String(state.accounts.length),
      "Accounts",
      "ri-user-settings-line",
    ) +
    statCard(String(state.workers.length), "Workers", "ri-cpu-line") +
    '<div class="card p-5"><div class="text-2xl font-bold">' +
    (running ? "&#9632; RUNNING" : "&#9633; STOPPED") +
    '</div><div class="text-xs text-muted-foreground">Tunnel Status</div></div>' +
    statCard(
      Number(state.totalReq).toLocaleString(),
      "Total Requests",
      "ri-bar-chart-line",
    );
  var card =
    '<div class="text-xl font-bold">' +
    (running ? "&#9632; RUNNING" : "&#9633; STOPPED") +
    "</div>" +
    '<div class="text-xs text-muted-foreground">Tunnel Status</div>' +
    tunnelDetailHtml() +
    tunnelActionsHtml();
  document.getElementById("tunnel-card").innerHTML = card;
  document.getElementById("tunnel-card-2").innerHTML = card;
  refreshBasecoat();
}

function statCard(value, label, icon) {
  return (
    '<div class="card p-5"><div class="text-2xl font-bold flex items-center gap-2"><i class="' +
    icon +
    '"></i>' +
    esc(value) +
    '</div><div class="text-xs text-muted-foreground">' +
    esc(label) +
    "</div></div>"
  );
}

function renderAccounts() {
  var box = document.getElementById("accounts-list");
  if (!state.accounts.length) {
    box.innerHTML =
      '<div class="card p-5"><h3 class="font-medium">No accounts configured</h3><p class="text-sm text-muted-foreground">Add a Cloudflare account to get started</p></div>';
  } else {
    box.innerHTML = state.accounts
      .map(function (a) {
        return (
          '<div class="card p-4 flex items-start justify-between gap-3">' +
          '<div><h3 class="font-medium">' +
          esc(a.name) +
          '</h3><p class="text-sm text-muted-foreground">Account ID: ' +
          esc(a.account_id) +
          "<br>API Token: " +
          esc(a.api_token) +
          "</p></div>" +
          '<button class="btn shrink-0" data-variant="destructive" data-del-account="' +
          esc(a.name) +
          '"><i class="ri-delete-bin-line"></i> Delete</button></div>'
        );
      })
      .join("");
  }
  refreshBasecoat();
}

function renderWorkers() {
  var tb = document.getElementById("workers-body");
  if (!state.workers.length) {
    tb.innerHTML =
      '<tr><td colspan="3" class="text-muted-foreground">No workers deployed — create workers to get started.</td></tr>';
  } else {
    tb.innerHTML = state.workers
      .map(function (w) {
        return (
          "<tr><td>" +
          esc(w.name) +
          '</td><td><a class="underline" target="_blank" rel="noreferrer" href="' +
          esc(w.url) +
          '">' +
          esc(w.url) +
          "</a></td>" +
          '<td class="text-right"><button class="btn" data-variant="destructive" data-del-worker="' +
          esc(w.name) +
          '" data-del-account="' +
          esc(w.config_account_name || state.workerAccount || "") +
          '"><i class="ri-delete-bin-line"></i> Delete</button></td></tr>'
        );
      })
      .join("");
  }
  var tr = document.getElementById("test-results");
  if (state.testResults.length) {
    tr.innerHTML =
      '<div class="card p-4 space-y-2"><h4 class="font-medium">Test Results</h4>' +
      state.testResults
        .map(function (r) {
          var ok = r.status === "ok";
          return (
            '<div class="flex justify-between text-sm gap-2 flex-wrap"><span>' +
            esc(r.name) +
            ' <span class="badge" data-variant="' +
            (ok ? "default" : "destructive") +
            '">' +
            esc(String(r.status).toUpperCase()) +
            "</span></span>" +
            '<span class="text-muted-foreground">' +
            esc(r.ms) +
            "ms | " +
            esc(r.ip || "\u2026") +
            " \u00b7 " +
            esc(r.geo || "\u2026") +
            " | " +
            esc(r.url) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>";
  } else {
    tr.innerHTML = "";
  }
  var btn = document.getElementById("btn-delete-all-workers");
  if (btn) btn.disabled = state.workers.length === 0;
  refreshBasecoat();
}

function renderTunnelForm() {
  var c = state.tunnelCfg;
  if (!c) return;
  document.getElementById("t-host").value = c.host || "0.0.0.0";
  document.getElementById("t-port").value = c.port || 8080;
  document.getElementById("t-rotation").value = c.rotation || "round-robin";
  document.getElementById("t-blacklist").value =
    c.blacklist || "blacklist-minimal.txt";
  document.getElementById("t-verbose").checked = !!c.verbose;
  document.getElementById("t-nossl").checked = !!c.no_ssl_intercept;
  document.getElementById("t-allowip").checked = !!c.allow_ip;
  refreshBasecoat();
}

function renderLogs() {
  var pre = document.getElementById("logs-pre");
  if (!state.logs.length) {
    pre.textContent = "No logs yet.";
    return;
  }
  pre.innerHTML = state.logs
    .map(function (l) {
      return (
        '<div class="flex gap-2"><span class="text-muted-foreground">[' +
        esc(l.timestamp) +
        ']</span><span class="log-' +
        esc(l.level) +
        '">[' +
        esc(l.level) +
        "]</span><span>" +
        esc(l.message) +
        "</span></div>"
      );
    })
    .join("");
}

/* Loaders */
async function loadDashboard() {
  try {
    var parts = await Promise.all([
      api.getAccounts(),
      api.getWorkers(),
      api.getTunnelStatus(),
    ]);
    state.accounts = parts[0];
    state.workers = parts[1];
    state.tunnel = parts[2];
    if (state.workers.length && !state.workerAccount)
      state.workerAccount = (state.accounts[0] && state.accounts[0].name) || "";
    try {
      var a = await api.getAnalytics(),
        tot = 0;
      for (var k in a) tot += (a[k] && a[k].total_requests) || 0;
      state.totalReq = tot;
    } catch (e) {
      state.totalReq = 0;
    }
    renderDashboard();
    syncPolling();
  } catch (e) {
    console.error(e);
  }
}

async function loadAccounts() {
  try {
    state.accounts = await api.getAccounts();
    renderAccounts();
  } catch (e) {
    /* noop */
  }
}

async function loadWorkers() {
  try {
    var parts = await Promise.all([api.getWorkers(), api.getAccounts()]);
    state.workers = parts[0];
    state.accounts = parts[1];
    if (!state.workerAccount && state.accounts[0])
      state.workerAccount = state.accounts[0].name;
    renderWorkers();
  } catch (e) {
    /* noop */
  }
}

async function loadTunnelConfig() {
  try {
    state.tunnelCfg = await api.getTunnelConfig();
    renderTunnelForm();
    renderDashboard();
  } catch (e) {
    /* noop */
  }
}

async function loadLogs() {
  try {
    var d = await api.getLogs();
    state.logs = d.logs || [];
    renderLogs();
  } catch (e) {
    /* noop */
  }
}

function syncPolling() {
  if (state.pollId) {
    clearInterval(state.pollId);
    state.pollId = null;
  }
  if (state.tunnel && state.tunnel.running) {
    state.pollId = setInterval(loadDashboard, 3000);
  }
}

/* Mutations */
async function handleAddAccount() {
  var name = document.getElementById("acc-name").value.trim();
  var token = document.getElementById("acc-token").value.trim();
  var id = document.getElementById("acc-id").value.trim();
  if (!name || !token || !id) {
    toast("All fields required", "err");
    return;
  }
  try {
    await api.addAccount({ name: name, api_token: token, account_id: id });
    document.getElementById("acc-name").value = "";
    document.getElementById("acc-token").value = "";
    document.getElementById("acc-id").value = "";
    document.getElementById("dlg-account").close();
    toast("Account added");
    loadAccounts();
    loadDashboard();
  } catch (e) {
    toast(e.message || "Failed", "err");
  }
}

async function handleDeleteAccount(name) {
  if (!confirm('Delete account "' + name + '"?')) return;
  try {
    await api.deleteAccount(name);
    toast("Account deleted");
    loadAccounts();
    loadDashboard();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function handleCreateWorkers() {
  var count = parseInt(document.getElementById("wk-count").value, 10) || 1;
  var account = document.getElementById("wk-account").value;
  var distribute = document.getElementById("wk-distribute").checked;
  if (!account) {
    toast("Select an account", "err");
    return;
  }
  try {
    await api.createWorkers({
      count: count,
      account: account,
      distribute: distribute,
    });
    document.getElementById("dlg-workers").close();
    toast("Created " + count + " workers");
    loadWorkers();
    loadDashboard();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function handleDeleteWorker(name, account) {
  if (!confirm('Delete worker "' + name + '"?')) return;
  try {
    await api.deleteWorker(name, account);
    toast("Worker deleted");
    loadWorkers();
    loadDashboard();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function handleDeleteAllWorkers() {
  if (!state.workers.length) return;
  if (
    !confirm(
      "Delete ALL " + state.workers.length + " workers? This cannot be undone.",
    )
  )
    return;
  if (!confirm("Really delete all " + state.workers.length + " workers?"))
    return;
  var btn = document.getElementById("btn-delete-all-workers");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Deleting\u2026";
  }
  var ok = 0,
    failed = [];
  for (var i = 0; i < state.workers.length; i++) {
    var w = state.workers[i];
    try {
      await api.deleteWorker(
        w.name,
        w.config_account_name || state.workerAccount,
      );
      ok++;
    } catch (e) {
      failed.push(w.name);
    }
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-delete-bin-line"></i> Delete All';
    refreshBasecoat();
  }
  if (!failed.length) toast("Deleted " + ok + " workers");
  else
    toast(
      "Deleted " + ok + ", " + failed.length + " failed: " + failed.join(", "),
      "err",
    );
  loadWorkers();
  loadDashboard();
}

async function handleTestWorkers() {
  state.testResults = [];
  renderWorkers();
  var base = [];
  try {
    var r = await api.testWorkers();
    base = r.results || [];
    state.testResults = base;
    renderWorkers();
  } catch (e) {
    toast(e.message, "err");
    return;
  }
  await Promise.allSettled(
    base.map(async function (t) {
      try {
        var res = await fetch(
          t.url + "?url=" + encodeURIComponent("http://ip-api.com/json/"),
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        var g = await res.json();
        if (g.status !== "success" || !g.query)
          throw new Error("lookup failed");
        var geo = [g.city, g.regionName, g.countryCode]
          .filter(Boolean)
          .join(", ");
        state.testResults = state.testResults.map(function (p) {
          return p.name === t.name
            ? Object.assign({}, p, { ip: g.query, geo: geo || "unknown" })
            : p;
        });
      } catch (e) {
        state.testResults = state.testResults.map(function (p) {
          return p.name === t.name
            ? Object.assign({}, p, { ip: "unavailable", geo: "unavailable" })
            : p;
        });
      }
      renderWorkers();
    }),
  );
}

function tunnelSettingsFromForm() {
  return {
    host: document.getElementById("t-host").value,
    port: parseInt(document.getElementById("t-port").value, 10) || 8080,
    rotation: document.getElementById("t-rotation").value,
    blacklist: document.getElementById("t-blacklist").value,
    verbose: document.getElementById("t-verbose").checked,
    no_ssl_intercept: document.getElementById("t-nossl").checked,
    allow_ip: document.getElementById("t-allowip").checked,
  };
}

async function handleSaveTunnel() {
  try {
    await api.saveTunnelConfig(tunnelSettingsFromForm());
    toast("Settings saved");
  } catch (e) {
    toast(e.message, "err");
  }
}

async function handleStartTunnel() {
  try {
    var r = await api.startTunnel(tunnelSettingsFromForm());
    if (r && r.error) {
      toast(r.error, "err");
      return;
    }
    toast("Tunnel started");
    loadDashboard();
  } catch (e) {
    toast(e.message, "err");
  }
}

async function handleStopTunnel() {
  try {
    var r = await api.stopTunnel();
    if (r && r.error) {
      toast(r.error, "err");
      return;
    }
    toast("Tunnel stopped");
    loadDashboard();
  } catch (e) {
    toast(e.message, "err");
  }
}

/* Tests tab (read-only: analytics + workers/test only) */
function testsBusy() {
  return !!(state.tests && state.tests.running);
}
function setTestsRunning(label) {
  state.tests = state.tests || {};
  state.tests.running = !!label;
  var ids = [
    "btn-test-a",
    "btn-test-b",
    "btn-test-c",
    "btn-test-d",
    "btn-run-all-tests",
  ];
  ids.forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.disabled = !!label;
  });
  document.getElementById("tests-status").textContent = label || "";
  refreshBasecoat();
}
function passBadge(ok) {
  return (
    '<span class="badge" data-variant="' +
    (ok ? "default" : "destructive") +
    '">' +
    (ok ? "PASS" : "FAIL") +
    "</span>"
  );
}
function testsRow(k, v) {
  return (
    '<div class="flex justify-between gap-2 flex-wrap"><span class="text-muted-foreground">' +
    esc(k) +
    "</span><span>" +
    esc(v || "\u2026") +
    "</span></div>"
  );
}

async function loadTests() {
  try {
    var parts = await Promise.all([api.getWorkers(), api.getAccounts()]);
    state.workers = parts[0];
    state.accounts = parts[1];
  } catch (e) {}
  var sel = document.getElementById("test-d-worker");
  if (sel) {
    if (!state.workers.length) {
      sel.innerHTML = '<option value="">No workers deployed</option>';
    } else {
      sel.innerHTML = state.workers
        .map(function (w) {
          return (
            '<option value="' + esc(w.name) + '">' + esc(w.name) + "</option>"
          );
        })
        .join("");
    }
  }
  refreshBasecoat();
}

async function runTestAccounts() {
  if (testsBusy()) return;
  setTestsRunning("Running (a) account validity\u2026");
  try {
    var a = await api.getAnalytics();
    state.tests.analytics = a || {};
    renderTestA();
  } catch (e) {
    toast(e.message || "Account check failed", "err");
  } finally {
    setTestsRunning("");
  }
}
function renderTestA() {
  var a = (state.tests && state.tests.analytics) || {};
  var names = Object.keys(a);
  var box = document.getElementById("test-a-results");
  if (!names.length) {
    box.innerHTML =
      '<p class="text-muted-foreground">No accounts reported.</p>';
  } else {
    var passed = names.filter(function (n) {
      return !!(a[n] && a[n].success);
    });
    box.innerHTML =
      "<div>" +
      passBadge(passed.length === names.length && names.length > 0) +
      ' <span class="text-muted-foreground">' +
      passed.length +
      " of " +
      names.length +
      " tokens valid</span></div>" +
      names
        .map(function (n) {
          var ok = !!(a[n] && a[n].success);
          return (
            '<div class="flex justify-between gap-2 flex-wrap"><span>' +
            esc(n) +
            "</span>" +
            passBadge(ok) +
            "</div>"
          );
        })
        .join("");
  }
  refreshBasecoat();
}

async function runProbeShared() {
  var r = await api.testWorkers();
  var base = r.results || [];
  base = base.map(function (t) {
    return { name: t.name, status: t.status, ms: t.ms, url: t.url, ip: "" };
  });
  state.tests.probe = base;
  await Promise.allSettled(
    base.map(async function (t) {
      try {
        var res = await fetch(
          t.url + "?url=" + encodeURIComponent("http://ip-api.com/json/"),
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        var g = await res.json();
        if (g.status !== "success" || !g.query)
          throw new Error("lookup failed");
        state.tests.probe = state.tests.probe.map(function (p) {
          return p.name === t.name ? Object.assign({}, p, { ip: g.query }) : p;
        });
      } catch (e) {
        state.tests.probe = state.tests.probe.map(function (p) {
          return p.name === t.name ? Object.assign({}, p, { ip: "" }) : p;
        });
      }
    }),
  );
  return state.tests.probe;
}
function probeOkWithIp() {
  return (state.tests.probe || []).filter(function (p) {
    return p.status === "ok" && p.ip;
  });
}

async function runTestRotation() {
  if (testsBusy()) return;
  setTestsRunning(
    "Running (b) rotation check\u2026 (workers/test takes ~30-60s)",
  );
  try {
    var st = await api.getTunnelStatus();
    state.tunnel = st;
    if (!state.tests.probe || !state.tests.probe.length) await runProbeShared();
    renderTestRotation();
  } catch (e) {
    toast(e.message || "Rotation check failed", "err");
  } finally {
    setTestsRunning("");
  }
}
function renderTestRotation() {
  var mode = (state.tunnel && state.tunnel.rotation) || "unknown";
  var ok = probeOkWithIp();
  var distinct = {};
  ok.forEach(function (p) {
    distinct[p.ip] = 1;
  });
  var n = Object.keys(distinct).length;
  var pass = ok.length > 0 && n > 1;
  var box = document.getElementById("test-b-results");
  box.innerHTML =
    "<div>" +
    passBadge(pass) +
    ' <span class="text-muted-foreground">mode ' +
    esc(mode) +
    " \u00b7 " +
    n +
    " distinct exit IP(s) across " +
    ok.length +
    " reachable worker(s)</span></div>" +
    (state.tests.probe || [])
      .map(function (p) {
        return (
          '<div class="flex justify-between gap-2 flex-wrap"><span>' +
          esc(p.name) +
          '</span><span class="text-muted-foreground">' +
          esc(p.ip || (p.status === "ok" ? "no IP resolved" : p.status)) +
          "</span></div>"
        );
      })
      .join("");
  refreshBasecoat();
}

async function runTestTunneling() {
  if (testsBusy()) return;
  setTestsRunning(
    "Running (c) tunneling check\u2026 (workers/test takes ~30-60s)",
  );
  try {
    if (!state.tests.probe || !state.tests.probe.length) await runProbeShared();
    renderTestTunneling();
  } catch (e) {
    toast(e.message || "Tunneling check failed", "err");
  } finally {
    setTestsRunning("");
  }
}
function renderTestTunneling() {
  var ok = probeOkWithIp();
  var box = document.getElementById("test-c-results");
  box.innerHTML =
    "<div>" +
    passBadge(ok.length > 0) +
    ' <span class="text-muted-foreground">' +
    ok.length +
    " of " +
    (state.tests.probe || []).length +
    " worker(s) reached the internet with an origin IP</span></div>" +
    (state.tests.probe || [])
      .map(function (p) {
        var good = p.status === "ok" && p.ip;
        return (
          '<div class="flex justify-between gap-2 flex-wrap"><span>' +
          esc(p.name) +
          "</span>" +
          passBadge(!!good) +
          "</div>"
        );
      })
      .join("");
  refreshBasecoat();
}

function normIpApi(d) {
  if (!d || d.status !== "success" || !d.query) return null;
  return {
    ip: d.query,
    country: d.country || "",
    regionCity: [d.city, d.regionName].filter(Boolean).join(", "),
    org: d.org || "",
    asn: d.as || "",
    timezone: d.timezone || "",
  };
}
function normIpWho(d) {
  if (!d || d.success === false || !d.ip) return null;
  var c = d.connection || {},
    tz = d.timezone || {};
  return {
    ip: d.ip,
    country: d.country || "",
    regionCity: [d.city, d.region].filter(Boolean).join(", "),
    org: c.isp || c.org || "",
    asn: c.asn != null ? "AS" + c.asn : "",
    timezone: tz.id || "",
  };
}
function normIpApiCo(d) {
  if (!d || d.error || !d.ip) return null;
  return {
    ip: d.ip,
    country: d.country_name || d.country || "",
    regionCity: [d.city, d.region].filter(Boolean).join(", "),
    org: d.org || "",
    asn: d.asn || "",
    timezone: d.timezone || "",
  };
}
function normIpInfo(d) {
  if (!d || d.bogon || !d.ip) return null;
  return {
    ip: d.ip,
    country: d.country || "",
    regionCity: [d.city, d.region].filter(Boolean).join(", "),
    org: d.org || "",
    asn: "",
    timezone: d.timezone || "",
  };
}
async function lookupExitIp(ip) {
  var chain = [
    {
      name: "ip-api.com",
      url:
        "http://ip-api.com/json/" +
        encodeURIComponent(ip) +
        "?fields=status,message,country,regionName,city,org,as,timezone,query",
      norm: normIpApi,
    },
    {
      name: "ipwho.is",
      url: "https://ipwho.is/" + encodeURIComponent(ip),
      norm: normIpWho,
    },
    {
      name: "api.ipapi.co",
      url: "https://api.ipapi.co/" + encodeURIComponent(ip) + "/json/",
      norm: normIpApiCo,
    },
    {
      name: "ipinfo.io",
      url: "https://ipinfo.io/" + encodeURIComponent(ip) + "/json",
      norm: normIpInfo,
    },
  ];
  for (var i = 0; i < chain.length; i++) {
    try {
      var res = await fetch(chain[i].url);
      if (!res.ok) continue;
      var d = await res.json();
      var n = chain[i].norm(d);
      if (n) return { provider: chain[i].name, info: n };
    } catch (e) {}
  }
  return null;
}
async function runTestExitIp(presetName) {
  if (testsBusy()) return;
  setTestsRunning("Running (d) exit-IP lookup\u2026");
  try {
    if (!state.tests.probe || !state.tests.probe.length) await runProbeShared();
    var sel = document.getElementById("test-d-worker");
    var want = presetName || (sel && sel.value) || "";
    var hit = null,
      i,
      list = state.tests.probe || [];
    for (i = 0; i < list.length; i++)
      if (list[i].name === want && list[i].ip) hit = list[i];
    if (!hit)
      for (i = 0; i < list.length; i++)
        if (list[i].status === "ok" && list[i].ip) {
          hit = list[i];
          break;
        }
    if (!hit) {
      document.getElementById("test-d-results").innerHTML =
        "<div>" +
        passBadge(false) +
        ' <span class="text-muted-foreground">no exit IP available \u2014 run (b)/(c) first</span></div>';
      refreshBasecoat();
      return;
    }
    if (sel) sel.value = hit.name;
    var found = await lookupExitIp(hit.ip);
    state.tests.ipinfo = found;
    renderTestExitIp(hit.name);
  } catch (e) {
    toast(e.message || "Exit-IP lookup failed", "err");
  } finally {
    setTestsRunning("");
  }
}
function renderTestExitIp(workerName) {
  var box = document.getElementById("test-d-results");
  var f = state.tests.ipinfo;
  if (!f) {
    box.innerHTML =
      "<div>" +
      passBadge(false) +
      ' <span class="text-muted-foreground">all IP-info providers failed for ' +
      esc(workerName || "") +
      "</span></div>";
  } else {
    var v = f.info;
    box.innerHTML =
      "<div>" +
      passBadge(true) +
      ' <span class="text-muted-foreground">via ' +
      esc(f.provider) +
      "</span></div>" +
      '<div class="grid sm:grid-cols-2 gap-x-4 gap-y-1">' +
      testsRow("Worker", workerName) +
      testsRow("IP", v.ip) +
      testsRow("Country", v.country) +
      testsRow("Region / City", v.regionCity) +
      testsRow("Org / ISP", v.org) +
      testsRow("ASN", v.asn) +
      testsRow("Timezone", v.timezone) +
      "</div>";
  }
  refreshBasecoat();
}
async function runAllTests() {
  if (testsBusy()) return;
  setTestsRunning("Running all tests\u2026 (a) account validity");
  try {
    var a = await api.getAnalytics();
    state.tests.analytics = a || {};
    renderTestA();
    setTestsRunning("Running all tests\u2026 workers/test takes ~30-60s");
    var st = await api.getTunnelStatus();
    state.tunnel = st;
    state.tests.probe = [];
    await runProbeShared();
    renderTestRotation();
    renderTestTunneling();
    var first = probeOkWithIp()[0];
    setTestsRunning("Running all tests\u2026 (d) exit-IP lookup");
    if (!first) {
      document.getElementById("test-d-results").innerHTML =
        "<div>" +
        passBadge(false) +
        ' <span class="text-muted-foreground">no exit IP available</span></div>';
      refreshBasecoat();
    } else {
      var found = await lookupExitIp(first.ip);
      state.tests.ipinfo = found;
      var sel = document.getElementById("test-d-worker");
      if (sel) sel.value = first.name;
      renderTestExitIp(first.name);
    }
    toast("All tests finished");
  } catch (e) {
    toast(e.message || "Run All failed", "err");
  } finally {
    setTestsRunning("");
  }
}

/* Tabs */
function switchTab(tab) {
  state.tab = tab;
  var items = document.querySelectorAll("#main-nav .nav-item");
  items.forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tab") === tab);
  });
  ["dashboard", "accounts", "workers", "tunnel", "logs", "tests"].forEach(
    function (t) {
      document.getElementById("tab-" + t).classList.toggle("hidden", t !== tab);
    },
  );
  if (tab === "dashboard") loadDashboard();
  else if (tab === "accounts") loadAccounts();
  else if (tab === "workers") loadWorkers();
  else if (tab === "tunnel") {
    loadTunnelConfig();
    loadDashboard();
  } else if (tab === "logs") loadLogs();
  else if (tab === "tests") loadTests();
  refreshBasecoat();
}

/* Wiring */
function closeOnBackdrop(dlg) {
  dlg.addEventListener("click", function (e) {
    var r = dlg.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dlg.close();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("#main-nav .nav-item").forEach(function (b) {
    b.addEventListener("click", function () {
      switchTab(b.getAttribute("data-tab"));
    });
  });

  var dlgA = document.getElementById("dlg-account");
  var dlgW = document.getElementById("dlg-workers");
  closeOnBackdrop(dlgA);
  closeOnBackdrop(dlgW);

  document
    .getElementById("btn-add-account")
    .addEventListener("click", function () {
      dlgA.showModal();
      refreshBasecoat();
    });
  document
    .getElementById("dlg-account-cancel")
    .addEventListener("click", function () {
      dlgA.close();
    });
  document
    .getElementById("dlg-account-save")
    .addEventListener("click", handleAddAccount);

  document
    .getElementById("btn-create-workers")
    .addEventListener("click", function () {
      var sel = document.getElementById("wk-account");
      sel.innerHTML = state.accounts
        .map(function (a) {
          return (
            '<option value="' +
            esc(a.name) +
            '"' +
            (a.name === state.workerAccount ? " selected" : "") +
            ">" +
            esc(a.name) +
            "</option>"
          );
        })
        .join("");
      dlgW.showModal();
      refreshBasecoat();
    });
  document
    .getElementById("dlg-workers-cancel")
    .addEventListener("click", function () {
      dlgW.close();
    });
  document
    .getElementById("dlg-workers-create")
    .addEventListener("click", handleCreateWorkers);

  document
    .getElementById("btn-test-workers")
    .addEventListener("click", handleTestWorkers);
  document
    .getElementById("btn-delete-all-workers")
    .addEventListener("click", handleDeleteAllWorkers);
  document
    .getElementById("btn-save-tunnel")
    .addEventListener("click", handleSaveTunnel);
  document
    .getElementById("btn-reload-tunnel")
    .addEventListener("click", loadTunnelConfig);
  document
    .getElementById("btn-refresh-logs")
    .addEventListener("click", loadLogs);
  document
    .getElementById("btn-clear-logs")
    .addEventListener("click", function () {
      state.logs = [];
      renderLogs();
    });
  document
    .getElementById("btn-test-a")
    .addEventListener("click", runTestAccounts);
  document
    .getElementById("btn-test-b")
    .addEventListener("click", runTestRotation);
  document
    .getElementById("btn-test-c")
    .addEventListener("click", runTestTunneling);
  document.getElementById("btn-test-d").addEventListener("click", function () {
    runTestExitIp();
  });
  document
    .getElementById("btn-run-all-tests")
    .addEventListener("click", runAllTests);

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-action]");
    if (t) {
      var a = t.getAttribute("data-action");
      if (a === "start-tunnel") handleStartTunnel();
      else if (a === "stop-tunnel") handleStopTunnel();
      return;
    }
    var da = e.target.closest("[data-del-account]");
    var dw = e.target.closest("[data-del-worker]");
    if (dw) {
      handleDeleteWorker(
        dw.getAttribute("data-del-worker"),
        dw.getAttribute("data-del-account") || state.workerAccount,
      );
      return;
    }
    if (da && !dw) {
      handleDeleteAccount(da.getAttribute("data-del-account"));
    }
  });

  loadDashboard();
  loadTunnelConfig();
  refreshBasecoat();
});
