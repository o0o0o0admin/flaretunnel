# AGENTS.md — FlareTunnel (flareproxy)

**Not a git repo** — no history/branches; don't bother with git commands. Nothing here is "committed", incl. build artifacts and secrets (see below).

## OVERVIEW

Cloudflare Worker rotating proxy: prebuilt Go binary `flaretunnel` (no source in repo) + Basecoat/vanilla-JS control panel in `web-basecoat/`. One container runs both: proxy on container :8080, API+UI on :8081. The old Next.js panel (`web-next/`) is deleted — backup at `web-next-backup-20261010.tar.gz`.

## COMMANDS

```bash
docker compose up -d --build    # host :18080 → proxy, :18081 → panel/API
chmod +x flaretunnel && ./flaretunnel --api 8081   # binary runs only from REPO ROOT; mode is 644 on disk
# panel has NO build step — static files served by the binary (web-next/out is a symlink → ../web-basecoat)
```

Panel changes: edit files in `web-basecoat/`, refresh browser. Verify with `curl -s localhost:8081/ | grep basecoat` and the API on :8081.

## WHERE TO LOOK

| Task                  | Location                                      | Notes                                                                                        |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Panel UI (6 tabs)     | `web-basecoat/` (index.html/theme.css/app.js) | 3-file no-build CSR panel: dashboard/accounts/workers/tunnel/logs/tests                      |
| Backend API contract  | `web-basecoat/app.js` (`apiGet/apiPost/...`)  | calls `http://localhost:8081/api/*` (CORS `*`); binary owns the server side                  |
| Theme/tokens          | `web-basecoat/theme.css` + `design.md`        | oklch neutral tokens, JetBrains Mono, basecoat-lyra — universal spec in `design.md`          |
| Deploy                | `Dockerfile`, `docker-compose.yml`            | scratch image; copies `flaretunnel` + `web-basecoat` → `./web-next/out`; `/data` volume      |
| Upstream mirror       | `basecoat/`                                   | vendored hunvreus/basecoat clone (has own AGENTS.md) — read-only reference, not project code |
| Universal design spec | `design.md`                                   | Basecoat design system for any app: tokens, stack pin, component recipes, footguns           |

Panel footguns: pinned CDN stack (`basecoat-css@1.0.2`, `@tailwindcss/browser@4`) — no npm/build; every dynamic `innerHTML` render must end with `basecoat.initAll({ force: true })` or Basecoat components on injected markup stay dead; variants via `data-variant` attrs, not classes.

## BACKEND BINARY (read-only)

- `flaretunnel` is a prebuilt x86-64 static Go binary — **no Go source here**; backend bugs can only be worked around in the panel.
- Resolves `./flaretunnel.json`, `./blacklist-*.txt`, and serves `./web-next/out` relative to cwd → always run from repo root. `web-next/` is a stub dir whose `out` symlink points at `../web-basecoat` (binary hardcodes `web-next/out`, no env override).
- `./flaretunnel --help` (after `chmod +x`) lists subcommands: `config/create/list/test/export/import/cleanup/tunnel`.
- ⚠️ `--api <port>` auto-starts the tunnel and can **auto-create workers against live Cloudflare** (driven by `.env` FLARETUNNEL_*). Production-mutating — don't run casually.
- Runtime state (endpoints, tunnel config, CA key) lives under `/data` in the container; extra env knobs exist: `FLARETUNNEL_DATA_DIR/MODE/HOST/PORT/BLACKLIST`.

## SECRETS

- `flaretunnel.json` holds **live Cloudflare `api_token`s** (bind-mounted into the container). Never paste into logs/issues/prompts. The API redacts tokens (`"cfut_..."`), but `flaretunnel.json` on disk is cleartext — don't screenshot the file.
- `flaretunnel_ca.key` is the MITM CA **private key** at repo top level — same handling as tokens.
- Rotate tokens if exposed.

## CONVENTIONS (panel)

- API layer: `apiGet/apiPost/apiDel` helpers in `web-basecoat/app.js`; errors → `basecoat.toast` (auto-dismiss).
- Mutations confirm with `confirm()`; `encodeURIComponent(name)` on account DELETE query.
- Lyra/neutral Basecoat pack, Remix Icon, JetBrains Mono; full recipes in `design.md`.
- Dashboard polls every 3s while tunnel runs; logs refresh manually. Status shown as text glyphs (`■ RUNNING`/`□ STOPPED`), not icons.
- Tests tab is read-only (`analytics` + `workers/test` + `tunnel/status` only). Slow endpoints: `workers` ~3s, `analytics` ~5s, `workers/test` ~30-60s — wait, don't poll.

## NOTES

- `docker-compose.yml` header comment mentions `docker-compose.web.yml` (doesn't exist) and still says "Next.js UI" (stale, panel is Basecoat); just use `docker compose up -d --build`.
- `app.js` hardcodes `API_BASE=http://localhost:8081` — panel opened via LAN/another host calls the browser's own localhost and breaks. One-line fix if remote access is ever needed.
- Ignore in searches: `basecoat/` (mirror), `.omo/` (tool runtime), `.ruff_cache/`, `*.tar.gz`, `flaretunnel` (binary).
- `blacklist-minimal.txt` is the compose default; tunnel's `blacklist` field is a filename, not list content.
- No build artifacts anymore: `web-basecoat/` is served as-is (in the image it lands at `./web-next/out`).
