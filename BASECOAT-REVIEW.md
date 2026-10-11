# Basecoat Review (basecoatui.com / hunvreus/basecoat)

Reviewed: v1.0.2 (npm `basecoat-css`), MIT, Tailwind CSS v4 only. Verified against README, docs site, and real GitHub usage.

## What it is

A vanilla-HTML reimplementation of the shadcn/ui design system: semantic HTML components styled by Tailwind v4, with a small vanilla JS runtime only where behavior is needed (tabs, toast, dropdown, select, sidebar, popover, tooltip, accordion). Dialog is native `<dialog>` — zero JS. Built by Ronan Berder.

Architecture is the interesting part: **structure ≠ style**. `base/` + `components/` define tokens and markup contracts; eight interchangeable _style packs_ (Vega default, Nova, Maia, **Lyra**, Mira, Luma, Sera, Rhea) supply the visuals. Token names are shadcn/ui-compatible, so TweakCN/themecss token blocks drop in over a pack.

## How you use it

- **No-build path (what we use):** CDN CSS per pack (`basecoat-lyra.cdn.min.css`), `@tailwindcss/browser@4` for utilities, per-component JS files (`tabs.min.js`, `toast.min.js`…) plus `basecoat.min.js` runtime. Version-pin everything.
- **Bundler path:** `@import "tailwindcss"; @import "basecoat-css/lyra";` — pick exactly one pack.
- **Lifecycle:** `window.basecoat.initAll()` on load; `initAll({ force: true })` after injecting DOM (the CSR-critical bit); component instances hang off elements (`el.sidebar.toggle()`, `el.toast({...})`).
- **API style:** class + `data-variant`/`data-size` attributes, not variant classes (old class API lives behind a `compat` import).
- **Icons:** not bundled — bring Remix Icon / Lucide / inline SVG. `data-icon="inline-start"` spacing assumes inline SVGs; icon fonts need manual spacing.

## Strengths

- shadcn look with no React, no Radix, no build step — a control panel like ours collapses to ~3 static files.
- Style-pack separation is real engineering: swap `basecoat-lyra` for `basecoat-maia` and the whole product changes skin without touching markup.
- Token compatibility with the shadcn ecosystem means our existing oklch neutral theme block applies nearly as-is.
- Small surface: ~15 components, docs show copy-pasteable HTML for each. MIT, active (1.0.x released, Discord, sponsor link).
- Native `<dialog>` for modals is the correct lazy choice — less JS to ship and debug.

## Weaknesses / risks

- **Young 1.0 API.** The data-attribute API replaced class-based variants recently; a `compat` shim exists, which signals churn. Pin versions.
- **CDN Tailwind is a dev convenience**, not production-grade (runtime compilation). Fine for a LAN control panel; wrong for public deploy.
- **No icon library** — you own icon consistency (minor; we'd use Remix Icon anyway).
- **JS init is easy to forget** after dynamic rendering — the #1 integration bug in CSR apps. `initAll({force:true})` after every re-render.
- No charts, no data-table pagination, no virtualization — tables are plain `<table class="table">`. Fine for 44 workers; not for 10k rows.
- Ecosystem is thin vs shadcn/React (no Radix-grade a11y audit trail yet), and docs are still one-site-deep.

## Verdict for flareproxy

**Good fit, with eyes open.** The current panel is a Next.js 16 _static export_ whose only job is fetching `/api/*` and rendering — React buys nothing here (no SSR, no routing, no server code; it's a 289-line client monolith). Basecoat + vanilla JS gets the same product with:

- **No toolchain:** no `node_modules` (496 pkgs today), no build step, no Turbopack, no "eslint not found" state repair.
- **Direct serving:** drop the folder anywhere; it can even live inside the Go binary's static dir later.
- **Same design language:** Lyra pack + neutral oklch tokens ≈ the existing `base-lyra`/`neutral` shadcn theme.

What you give up: TypeScript checking of the API contract, and hand-written state management instead of React's re-render model. For a 5-tab internal tool whose logic is `fetch → innerHTML`, that's an acceptable trade. Risks are version drift (pin `@1.0.2`) and the init-after-render footgun (centralize re-render in one function that ends with `basecoat.initAll({force:true})`).

**Ship-it rating: 8/10** for this repo's control panel; skip it for anything needing charts, large tables, or React-ecosystem components.
