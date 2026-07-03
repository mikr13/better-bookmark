# Better Bookmarks Design System

## 1. Atmosphere & Identity

Better Bookmarks feels like a quiet research instrument: focused, local, and privacy-aware. The signature is graphite depth with sparse blue signal: surfaces step forward through tonal changes, while the blue accent appears only when an action, model, or remembered concept needs attention.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/primary | `--background` | `oklch(0.985 0.003 247)` | `oklch(0.145 0.012 260)` | Page background |
| Surface/secondary | `--card` | `oklch(1 0 0)` | `oklch(0.19 0.014 260)` | Cards and panes |
| Surface/elevated | `--popover` | `oklch(1 0 0)` | `oklch(0.225 0.016 260)` | Selects, tooltips, popovers |
| Text/primary | `--foreground` | `oklch(0.18 0.014 260)` | `oklch(0.955 0.006 260)` | Headings and body |
| Text/secondary | `--muted-foreground` | `oklch(0.48 0.018 260)` | `oklch(0.72 0.018 260)` | Hints and metadata |
| Border/default | `--border` | `oklch(0.89 0.008 260)` | `oklch(0.29 0.016 260)` | Dividers and outlines |
| Field/background | `--input` | `oklch(0.94 0.006 260)` | `oklch(0.255 0.014 260)` | Inputs and muted controls |
| Accent/primary | `--primary` | `oklch(0.58 0.18 255)` | `oklch(0.72 0.15 250)` | Primary actions, links, focus |
| Accent/subtle | `--accent` | `oklch(0.93 0.03 250)` | `oklch(0.28 0.035 250)` | Selected chips and hover surfaces |
| Status/success | `--status-success` | `oklch(0.63 0.16 150)` | `oklch(0.75 0.14 150)` | Completed save state |
| Status/warning | `--status-warning` | `oklch(0.73 0.15 80)` | `oklch(0.78 0.15 80)` | Missing setup, privacy preview |
| Status/error | `--destructive` | `oklch(0.58 0.2 25)` | `oklch(0.68 0.19 25)` | Error and destructive actions |

### Rules

- Blue is action and model state only, never decoration.
- Graph and concept accents use low-chroma variants of blue, green, and amber.
- Raw color values stay in `DESIGN.md` and `src/assets/globals.css`; components use tokens and Tailwind semantic utilities.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| H1 | 28px | 650 | 1.15 | 0 | Settings and side panel title |
| H2 | 20px | 620 | 1.25 | 0 | Section heading |
| H3 | 16px | 600 | 1.35 | 0 | Card title |
| Body | 14px | 400 | 1.5 | 0 | Default UI text |
| Body/sm | 13px | 400 | 1.45 | 0 | Secondary details |
| Caption | 12px | 520 | 1.35 | 0 | Metadata and labels |

### Font Stack

- Primary: `Geist Variable, ui-sans-serif, system-ui, sans-serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, monospace`

### Rules

- Extension surfaces are compact; no hero-scale type inside tool panes.
- Text must not scale with viewport width.
- Letter spacing remains `0` unless a tiny uppercase label needs `0.04em`.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | 4px | Icon-to-label |
| `--space-2` | 8px | Compact rows |
| `--space-3` | 12px | Field padding |
| `--space-4` | 16px | Card padding |
| `--space-5` | 20px | Dense section spacing |
| `--space-6` | 24px | Comfortable card spacing |
| `--space-8` | 32px | Page section spacing |

### Grid

- Options page max content width: 1080px.
- Side panel width target: 360px to 520px.
- Popup width target: 360px.
- Breakpoints follow Tailwind defaults.

### Rules

- Use full-width bands or unframed layouts for page structure.
- Cards are for individual settings groups, saved pages, and popovers only.
- Do not put cards inside cards.

## 5. Components

### App Shell
- **Structure**: Header with brand, compact view switch, and icon actions.
- **States**: default, active tab, loading, setup-required.
- **Accessibility**: one `main`, labeled navigation, visible focus rings.
- **Motion**: tab change is opacity/transform under 180ms.

### Settings Card
- **Structure**: Heading, short description, grouped controls, optional footer actions.
- **States**: default, active, loading, error, disabled.
- **Accessibility**: labels bind to fields; status text uses polite live regions.
- **Motion**: no decorative mount animation.

### Provider Key Row
- **Structure**: API-key input, save/delete buttons, status badge, model select.
- **States**: empty, validating, active, invalid, model-loading.
- **Accessibility**: key input never leaks the saved value; actions have explicit labels.
- **Motion**: button active scale only.

### Bookmark Card
- **Structure**: title, URL/domain, summary, concept chips, relevance metadata.
- **States**: default, hover, selected, empty.
- **Accessibility**: URL is readable; links are keyboard reachable.
- **Motion**: hover changes tonal surface only on fine pointers.

### Concept Chip
- **Structure**: term, score where useful, optional mute action.
- **States**: default, active, muted, disabled.
- **Accessibility**: contrast does not rely only on color.
- **Motion**: none except active press.

### Highlight Popover
- **Structure**: term, saved-page count, top matches, open side panel action.
- **States**: default, keyboard opened, pointer opened, reduced motion.
- **Accessibility**: Escape closes and focus returns to the highlighted trigger.
- **Motion**: pointer popover uses origin-aware opacity/scale from `0.96`; keyboard path is instant.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 100-150ms | `cubic-bezier(0.2, 0, 0, 1)` | Button press, switch |
| Standard | 160-220ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Popovers, tabs |
| Panel | 220-280ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Side panel route change |

### Rules

- Animate only `transform` and `opacity`.
- No `transition: all`.
- Keyboard-triggered UI should not add decorative movement.
- Respect `prefers-reduced-motion`.
- Common UI motion stays under 300ms.

## 7. Depth & Surface

### Strategy

Mixed tonal-shift plus thin rings.

| Level | Treatment | Usage |
| --- | --- | --- |
| Level 0 | Background token | Page canvas |
| Level 1 | Card token plus subtle ring | Settings and saved-page cards |
| Level 2 | Elevated token plus shadow/ring | Selects and popovers |
| Level 3 | Darker graphite step | Highlight popover on webpages |

Depth must feel restrained and functional. Avoid decorative glow fields, generic purple gradients, and one-note beige/brown palettes.
