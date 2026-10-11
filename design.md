# DESIGN.md — Basecoat Universal Design System

Reusable spec for any app built on Basecoat. Derived from the shipped
`web-basecoat/` control panel. Every value here is verified working — build to
this, don't re-derive.

## 1. Stack contract (non-negotiable)

| Piece        | Choice                           | Notes                                                                                        |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Components   | `basecoat-css@1.0.2`             | **Pin exact version** — 1.0 API still moves; old class aliases may be removed                |
| Style pack   | Lyra (`basecoat-lyra`)           | Structure/style separation: pack = look, base = behavior. Swap packs without touching markup |
| Utility CSS  | Tailwind CSS **v4**              | v3 does not work (Basecoat components use v4-only variants like `inset-ring`)                |
| Icons        | Remix Icon `4.5.0`               | `<i class="ri-delete-bin-line"></i>`                                                         |
| Font         | JetBrains Mono (400/500/600/700) | Heading **and** body — monospace-everywhere is the identity                                  |
| JS framework | **None**                         | Vanilla JS. Basecoat runtime is ~3KB gzip                                                    |
| Corners      | `--radius: 0`                    | Sharp everywhere; buttons use explicit `rounded-md` etc. only where the pack needs it        |
| Mode         | Dark-first                       | `<html class="dark">` at load; light tokens exist for completeness                           |

### CDN bootstrap (no-build apps)

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/basecoat-lyra.cdn.min.css"
/>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css"
/>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
/>
<link rel="icon" href="data:," /><!-- kills favicon.ico 404 -->
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/js/basecoat.cdn.min.js"
></script>
```

Load order: Tailwind → Basecoat CSS → Remix → fonts → your theme.css → body markup → Basecoat JS → app.js.

### Bundled path (build apps)

`@tailwindcss/vite` + `basecoat-css` npm + `basecoat` JS package; import
`@basecoat/lyra-theme` (or the current pack import name) instead of the CDN CSS.

## 2. Theme tokens

Ship verbatim in `theme.css` **after** Basecoat's CSS (later load wins):

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.205 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.922 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

Neutral achromatic ramp (chroma 0), destructive is the only hue. Same chart
values both modes — neutral charts by design.

## 3. Font + shape overrides

In `theme.css`, after the token block:

```css
html {
  font-family: "JetBrains Mono", ui-monospace, monospace;
}
:root {
  --font-sans: "JetBrains Mono", ui-monospace, monospace;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --radius: 0;
}
```

- Body text, headings, inputs, buttons: all mono. Hierarchy via weight (500/600/700)
  and color (`text-muted-foreground`), never via family/size extremes.
- No border radius on cards/panels. Buttons may keep the pack's small radius.

## 4. Layout skeleton (app shell)

```html
<body class="min-h-svh bg-background text-foreground">
  <div class="flex min-h-svh">
    <aside
      class="w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col"
    >
      <div class="p-4 border-b"><!-- brand: icon + title + subtitle --></div>
      <nav class="flex-1 p-2 space-y-0.5"><!-- .nav-item buttons --></nav>
      <div class="p-3 border-t text-xs text-muted-foreground">
        <!-- footer meta -->
      </div>
    </aside>
    <main class="flex-1 p-8 space-y-6"><!-- tab panels --></main>
  </div>
</body>
```

### Nav item ("Menu: Default / Solid", "Accent: Bold")

Active item = **solid filled block, full-bleed within the nav padding, bold text**.
This is the signature interaction of the system:

```html
<button
  class="nav-item w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium
               text-sidebar-foreground hover:bg-sidebar-accent
               data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
  data-active="true"
  data-tab="dashboard"
>
  <i class="ri-dashboard-line"></i> Dashboard
</button>
```

JS toggles `data-active` on click. Icon + label always paired.

## 5. Component recipes

### Button

```html
<button class="btn" data-variant="default">Save</button>
<button class="btn" data-variant="destructive">Delete</button>
<button class="btn" data-variant="outline">Reload</button>
```

Variants are **data-attributes, not classes** (`data-variant`). Destructive =
destructive token. Icon-only buttons carry `title` (tooltip).

### Badge / status

Status is a badge + glyph. Status shown as **text glyphs**, not icons:
`■ RUNNING` / `□ STOPPED` (stable across fonts, log-friendly).

```html
<span class="badge" data-status="running">■ RUNNING</span>
```

### Card

```html
<div class="card p-4 space-y-1">
  <div class="flex items-center gap-2 text-muted-foreground text-sm">
    <i class="ri-user-line"></i> Accounts
  </div>
  <p class="text-2xl font-semibold">22</p>
</div>
```

Stat cards: glyph+label muted on top, big mono number below. Card grid: `grid gap-4 md:grid-cols-4`.

### Table

```html
<table class="table w-full text-sm">
  <thead>
    <tr>
      <th>Name</th>
      <th>URL</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- rows; actions right-aligned -->
  </tbody>
</table>
```

Empty state: one muted line under the table, no illustration.

### Dialog (native `<dialog>` — Basecoat wires it)

```html
<dialog class="dialog p-0 w-md">
  <form method="dialog" class="p-4 space-y-4">
    <h2 class="font-semibold">Add Account</h2>
    <!-- inputs: class="input w-full" with <label class="text-sm font-medium"> above -->
    <div class="flex justify-end gap-2">
      <button class="btn" value="cancel" data-variant="outline">Cancel</button>
      <button class="btn" value="ok" data-variant="default">Save</button>
    </div>
  </form>
</dialog>
```

- Open: `dlg.showModal()`; close via `method="dialog"` buttons (no JS close plumbing).
- Triggers: `data-dialog-open="<id>"` / `data-dialog-close="<id>"` (Basecoat handles them).
- **Re-bind dynamic triggers** after every innerHTML re-render (runtime does not
  delegate `data-dialog-open` on new nodes).
- Destructive actions: `confirm()` before any DELETE — no fancy confirm dialog.

### Toast

```js
basecoat.toast.success("Tunnel started"); // .info .warning .error variants exist
```

Auto-dismiss ~3s. Use for every mutation outcome (success and failure).

### Input / select / checkbox

```html
<label class="text-sm font-medium">Port</label>
<input class="input w-full" type="number" value="8080" />
<select class="select w-full">
  <!-- options -->
</select>
<label class="flex items-center gap-2 text-sm">
  <input type="checkbox" class="checkbox" /> Verbose Logging
</label>
```

Two-column forms: `grid gap-4 sm:grid-cols-2`.

## 6. JS runtime rules (the footguns)

1. **Every dynamic `innerHTML` render MUST end with:**
   ```js
   if (window.basecoat?.initAll) basecoat.initAll({ force: true });
   ```
   Missing this = dead tooltips/menus/dialog-triggers on injected markup.
2. Variants via `data-variant` / `data-status` attributes only.
3. Escape all interpolated strings: `function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}`
4. Toast API is namespaced under `window.basecoat` in the current CDN — check
   before assuming a global `toast`.
5. Keep app logic in one `app.js`; no bundler needed under ~2k LOC.

## 7. UX conventions

- API base: absolute URL (`http://host:port/api`) — enables cross-port dev; the
  server must send `Access-Control-Allow-Origin: *`. Same-origin rewrites are
  fine behind a real deploy.
- Poll status endpoints every **3s only while a running flag is true**; 0 interval when idle.
- Refresh lists manually (button), never on a timer.
- Tab panels: show/hide by id (`tab-<name>`); nav sets `data-active`; each panel
  fetches on activation.
- Footer of sidebar or page shows the API base / environment — cheap observability.
- Loading: disable the triggering button (`btn-disabled` class) until the await
  returns; then toast + re-render.
- Numbers: `toLocaleString()`; timestamps ISO-ish `[YYYY-MM-DD HH:mm:ss]` in logs.

## 8. Do / Don't

| Do                                         | Don't                                    |
| ------------------------------------------ | ---------------------------------------- |
| Pin `basecoat-css@1.0.2` exactly           | Use `@latest` or unpinned CDN            |
| `initAll({force:true})` after every render | Assume Basecoat auto-inits injected HTML |
| Tailwind v4 only                           | Pair with Tailwind v3                    |
| `data-variant` for button looks            | Invent new button color classes          |
| Mono everywhere, weight for hierarchy      | Introduce a second font family           |
| `confirm()` for destructive ops            | Ship unguarded DELETE calls              |
| Text glyphs ■/□ for status                 | Emoji or icon-only status                |
| `esc()` on every interpolation             | innerHTML with raw user/API strings      |

## 9. File layout convention

```
<app>/
  index.html   # shell + all static markup (tabs, dialogs)
  theme.css    # tokens + font/shape overrides (this doc, §2–3)
  app.js       # api layer + per-tab render fns + initAll calls
```

Three files is the default. Add files only when a boundary forces it.
