# FlareTunnel

Cloudflare Worker rotating proxy + Basecoat control panel in one container.
Proxy → `:18080`, panel + API → `:18081`.

## Run (no build)

```bash
cp .env.example .env
# add your flaretunnel.json: { "accounts": [ { "name", "api_token", "account_id" } ] }
docker compose pull && docker compose up -d
```

Image: `ghcr.io/o0o0o0admin/flaretunnel:v1.0.0`. Or build locally: `docker compose up -d --build`.

## Panel

Static 6-tab UI (`web-basecoat/`, no build step): Dashboard · Accounts · Workers · Tunnel · Logs · Tests.
First boot auto-creates workers on live Cloudflare up to `FLARETUNNEL_WORKERS` (default 10).

## Layout

- `web-basecoat/` — the panel (edit + refresh, served by the binary)
- `Dockerfile`, `docker-compose.yml` — scratch image + wiring, state in `/data`
- `design.md` — the Basecoat design system spec; `AGENTS.md` — agent notes

`flaretunnel.json` (account tokens) and `.env` are **never committed** — see `.env.example`.
