# SplitterAI — Design System (design.md)

This documents the design system **as actually implemented** in `src/index.css`
and the component code — not the "warm cinematic" palette described in the
current README, which is stale and doesn't match what's built. Treat this file
as the source of truth going forward; update the README to match this, not the
other way around.

---

## 1. Identity

SplitterAI is a developer control console for orchestrating AI agents — closer
in spirit to an IDE or a mission-control dashboard than a consumer SaaS product.
The design should read as **precise, technical, and calm under load**: dense
information without clutter, motion that communicates real state (a model
responding, an agent working) rather than decoration.

Reference points: Linear, Vercel dashboard, VS Code, Raycast. Avoid: generic
SaaS card-kit sameness, marketing-site spacing, decorative gradients or glow
without a status meaning behind them.

---

## 2. Color

Actual tokens from `src/index.css` (`:root` and Tailwind `@theme`):

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#070A10` | App base background |
| `--panel` | `#0F1420` | Card/panel surfaces |
| `--panel-2` | `#151B29` | Nested surfaces (inputs, node backgrounds, dropdown items) |
| `--border` | `#232B3D` | Default borders |
| `--border-soft` | `#181E2C` | Low-emphasis dividers |
| `--text` | `#E8ECF4` | Primary text |
| `--dim` | `#8992A6` | Secondary text |
| `--faint` | `#4B5468` | Tertiary text, placeholders, disabled |
| `--accent` | `#48B4FF` | Primary interactive accent — selection, active states, CTAs, focus rings |
| `--accent-dim` | `#122D46` | Accent background wash (badges, active-item backgrounds) |
| `--good` | `#4DCFB8` | Success / completed status |
| `--good-dim` | `#0F2E2A` | Success background wash |
| `--bad` | `#FF6E82` | Error / failed status |
| `--bad-dim` | `#331E27` | Error background wash |
| `--wait` | `#8B93FF` | Queued / paused / waiting status |
| `--wait-dim` | `#1E2145` | Waiting background wash |

This is a **cold blue** system, not warm terracotta/cream. Background isn't flat
black — `body` uses a very subtle radial gradient (`ellipse 1200px 800px at 50% -10%, #0E1826 → var(--bg)`) so the top of the viewport has a faint glow, giving
depth without a visible "spotlight" effect.

**Status color mapping (use consistently everywhere status appears — DAG nodes,
badges, sidebar dots, quota bars):**
- Working / running / planning → `--accent` (blue)
- Completed / success / healthy → `--good` (teal-green)
- Failed / error → `--bad` (coral-red)
- Queued / waiting / paused → `--wait` (periwinkle)
- Idle / pending → `--faint` (muted gray, no color coding — idle is the absence of a signal, not a signal itself)

Do not introduce new hues for new states. If a new status is needed, map it onto
one of the four existing semantic colors above based on what it means (active,
good, bad, waiting) rather than inventing a fifth color.

---

## 3. Typography

```css
--sans: 'IBM Plex Sans', sans-serif;
--mono: 'IBM Plex Mono', monospace;
```

Two families only — no separate display face. IBM Plex Sans carries all UI text
and headings (weights 400/500/600 loaded); IBM Plex Mono is used specifically
for anything that reads as *data*: timestamps, model identifiers, file paths,
subtask IDs, terminal content, status pills, section eyebrow labels. This
distinction matters — if a new piece of UI shows an identifier, a path, or
machine-generated text, it should be mono; if it's prose or a label a human
wrote, it's sans.

Base body size is `13.5px` — dense on purpose, not the ~16px baseline of a
marketing site. Don't fight this by sizing components larger "for readability";
tighter type is intentional for an information-dense console.

---

## 4. Layout system

- **Structural unit:** `--radius: 6px` on all panels, cards, buttons, inputs.
  Don't mix radii — no larger "friendly" rounding on some components and sharp
  corners on others.
- **Panels** are flat: `background: var(--panel)`, `border: 1px solid var(--border-soft)` (or `--border` for higher emphasis), **no drop shadows**
  on static panels. Shadows are reserved for genuinely elevated/floating
  elements (modals, dropdowns, the Flow canvas node cards) — see `shadow-2xl`
  usage on modals and `box-shadow: 0 8px 24px rgba(0,0,0,.35)` on flow nodes.
- **Grid-based command center layout:** the Project Overview page uses a
  `grid-cols-[1fr_280px] grid-rows-[1fr_auto]` split — main DAG content left,
  file explorer right (spanning both rows), terminal bottom-left. Reuse this
  exact grid shape for any future page that needs "main content + persistent
  side panel + persistent bottom panel" rather than inventing a new layout.
- **Sidebar** is a fixed-width navigation rail (collapsible), persistent across
  every route, containing: brand mark, primary nav (Home/Projects/Agents/
  Integrations/Flow), an "Active Sessions" list, and a workspace/account footer.

---

## 5. Components

### Status badge
Pill-shaped, `font-family: mono`, `font-size: 11px`, colored per the status
mapping in §2, with a small (6px) dot matching the same color preceding the
label. Background is the corresponding `-dim` wash at low opacity, border a
slightly stronger tint of the same hue. Implemented as `StatusBadge` /
`StatusDot` in `Badges.tsx` — reuse these components, don't recreate inline
status styling per-page (`StatusBadge` is already used correctly on the DAG
node cards; make sure every other place a status renders — Agents grid, Agent
Workspace header, sidebar session dots, Integrations cards — goes through the
same shared component).

### Agent identity
Each role (`planner`/`coder`/`auditor`/`tester`) has a fixed color + label +
description in `ROLE_META` (`data.ts`). Any UI showing an agent — avatar,
dropdown row, DAG node, chat message — should pull from this single source
rather than hardcoding role colors locally. Current role colors:

| Role | Color |
|---|---|
| Planner | `#7C3AED` (violet) |
| Coder | `#1A73E8` (blue) |
| Auditor | `#E8710A` (amber/orange) |
| Tester | `#0E9F6E` (green) |

Note these role colors are a *separate* palette from the status colors in §2 —
role color identifies *who*, status color identifies *what state they're in*.
Don't conflate the two (e.g. don't recolor an agent avatar based on its current
status; keep role color fixed, show status via the badge/dot next to it).

### Input box (chat / task composer)
`--panel` background, `1px solid var(--border)`, `--radius` corners, `padding: 14px`. Textarea is borderless/transparent inside. A divider (`border-top: 1px solid var(--border-soft)`) separates the textarea from the action row
below it (Add agent / Attach on the left, Send on the right). This exact
pattern (bordered container → transparent input → divided action row) is the
canonical input pattern for the app — reuse it for any future free-text entry
point rather than a plain unstyled `<input>`.

### Modal / drawer
`fixed inset-0 bg-black/75 backdrop-blur-xs` scrim, centered panel,
`--panel` background, `--border` border, `shadow-2xl`. Header row has a title
(with a small `lucide-react` icon at 15–16px) and a close (`X`) button aligned
right, separated from the body by `border-bottom: 1px solid var(--border-soft)`.
Footer actions are right-aligned, ghost button (cancel) + solid accent button
(primary action) — see the Plan-and-Confirm modal and Add Agent modal in
`ai-assistant-interface.tsx` for the reference implementation.

### DAG / node visualization (Flow page, Project Overview)
Nodes: `180–190px` wide cards, `--panel-2` background (one step lighter than
the page's `--panel`, so nodes visually sit "on top of" the canvas), `--radius`
corners, colored border only when the node has an active/notable status
(working → accent-tinted border, completed → good-tinted border; idle nodes
keep the neutral `--border-soft`). Selection state adds a 1px accent ring via
`box-shadow: 0 0 0 1px var(--accent)` layered with the existing drop shadow —
don't replace the shadow, add to it.

### Buttons
- **Primary:** solid `--accent` background, `--bg`-colored text (dark text on
  the bright accent, for contrast), `font-weight: 600`.
- **Ghost:** transparent background, `1px solid var(--border)`, `--dim` text,
  hover → `--text` + `--faint`/`--border` border strengthens.
- No secondary/tertiary button style beyond these two — resist adding a third
  button treatment; use ghost + spacing/grouping to express hierarchy instead.

---

## 6. Motion

Current usage is restrained and purposeful — keep it that way:

- **Background3D** (Three.js) — a constellation/particle network on the Home
  page only. Slow idle rotation, subtle parallax on mouse movement. This is the
  one place decorative motion is allowed, because it reinforces the literal
  concept (a network of agents) rather than being generic ambiance.
- **Status pulse** — animate opacity/glow only on elements in an actively
  "working" state (e.g. a working agent's status dot). Idle/completed/failed
  states are static. Motion should mean something (this thing is actively
  happening right now), not be applied uniformly for polish.
- **Loading states** — `Loader2` spin from `lucide-react` for in-flight async
  operations (plan generation, task execution). Paired with a short, specific
  message ("Decomposing Master Task" / "SplitterAI LLM planner is constructing
  parallel worker DAG...") rather than a bare spinner — every loading state
  should say what's happening, not just that something is happening.
- Avoid scroll-triggered animation, staggered entrance animations on lists, or
  hover-lift effects on static panels — none of that is in the current system
  and it would clash with the "console," not "marketing site," identity.

---

## 7. Iconography

`lucide-react` throughout, consistently sized at **13–16px** depending on
context (13–14px inline with 11–13px text, 15–16px next to headings/titles).
Stroke-based, not filled, matching the line-weight feel of IBM Plex. Don't mix
in a filled icon set or emoji for anything beyond the occasional inline warning
(`⚠️`) already used in error banners — keep those rare and functional, not
decorative.

---

## 8. States (apply to every data-driven view)

Every page/panel that loads real data needs to explicitly handle:

1. **Loading** — spinner + specific in-progress message (see §6). Never a blank
   panel while data is in flight.
2. **Empty** — a real empty state, not a panel that just renders nothing. The
   existing "No Active Agent Visualizer Nodes" treatment on Project Overview
   (icon + bold short message + one-line explanation, inside a `--panel-2`
   bordered box) is the reference pattern — reuse this shape for every other
   empty state (empty file tree, empty sessions list, empty integrations list,
   empty agents grid).
3. **Error** — the existing error banner pattern (`--bad`/`--bad-dim` colored
   box with a dismiss action) for inline/recoverable errors, and the
   `ErrorBoundary` full-panel fallback (§ "Component" below) for render crashes.
   Every error should tell the user what failed in plain language, not just
   surface a raw exception string with nothing else (the current
   `ErrorBoundary` shows the raw `error.message` in a mono block — keep that
   for developer usefulness, but make sure the human-readable title above it is
   always present and accurate, not a generic "Something went wrong" with no
   further context when more specific context is available).
4. **Populated** — the normal case, already well-covered across existing pages.

---

## 9. What NOT to do

- Don't introduce a light mode / light content canvas — the README's old
  "warm cream content canvas" description does not match the shipped product
  and shouldn't be resurrected; the whole app is dark-surface end to end.
- Don't add new accent colors per-feature (e.g. a unique purple for
  Integrations, a unique green for Files) — every new surface should draw from
  the existing accent/good/bad/wait + role-color palettes in §2/§5.
- Don't add card drop-shadows to static panels — reserve elevation (shadow) for
  things that are genuinely floating above the base layer (modals, dropdowns,
  draggable nodes).
- Don't increase base font sizes to "improve readability" — the density is
  intentional for a console product; if something feels cramped, fix spacing/
  hierarchy, not the type scale.
