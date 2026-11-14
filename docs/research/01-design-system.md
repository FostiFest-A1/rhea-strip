# 01 — Design system

Reference: `docs/Backgrounds Supply ｜ Jaw-Dropping Backgrounds for Your Projects (11_5_2026 5：13：12 PM).html` (SingleFile snapshot of https://backgrounds.supply/?utm_source=designeer.xyz, saved Thu 2026-11-05 17:13:12 WIB, 2.89 MB). Product: Rhea Strip (yield tokenization, PT/YT, NEAR).

**Citation key.** The snapshot is minified onto 5 physical lines, so line numbers are useless. Every finding cites a stable locator instead:
- `S1`..`S8` = the n-th `<style>` element in document order. S1 = SingleFile image vars; S2 = `body{transition:opacity ease-in .2s}`; S3 = Tailwind v4 compiled output + site globals; S4 = the page's CSS Module (`home-module__RoZqoW__*`, prefix dropped below); S5 = `next/font` faces (geist, editorsNote, outfit, inter); S6 = Satoshi `@font-face`; S7 = `.sf-hidden`; S8 = empty.
- `B` = body markup (`#id` / `.class`). `M` = `<head>` meta. `Img` = embedded data-URI assets.
- Pretty-printed extractions (scratchpad only): `/tmp/claude-1000/-home-cn-Projects-Competition-Web3-NEAR-Rhea/bdb8c193-199a-4069-8f1d-7cc568832157/scratchpad/ds/` — `app1.css` (S4, one rule per line), `css_tw.css` (S3), `css_fonts.css` (S5), `css_satoshi.css` (S6), `outline.txt` (B), `assets/` (decoded PNG/WebP).

---

## Summary

- **Look in one line:** a dark-only, near-black (`#000`) "light-in-the-void" marketing style. A single hot pink accent (`#FE3D70`) over white-alpha text/hairlines, with 80px/88px tight-tracked grotesk headlines (Satoshi) where one or two words flip to an *italic serif in pink* (Editor's Note). Everything else is quiet: r32 cards with 1px inset hairlines, pill buttons, frosted-glass pills, no solid borders, no light theme.
- **Stack (evidenced):** Next.js App Router (`data-nimg`, `next-route-announcer`, `data-precedence=next`, `next/font` class names), Tailwind v4 used almost only for the base reset (utilities in the build: `.flex .min-h-full .flex-col .antialiased` only), **all real design is a hand-written CSS Module** (143 classes), Lenis smooth scroll (`html.lenis`), Unicorn Studio WebGL canvases for the hero and footer backgrounds. Page JS was stripped by SingleFile, so motion library identity is inferred (see Assumptions). [S3 `@layer utilities`; S4; B `<html class="h-full antialiased lenis">`]
- **Tokens that matter:** 2 CSS custom properties on the page root (`--hv-pink:#FE3D70`, `--hv-bg:#000`) + 4 font variables; everything else is literal values. One signature easing `cubic-bezier(.22,1,.36,1)` (10 uses), letter-spacing = `-0.02em` on every display size, line-height 1.1 (display) / 1.2 (sub-heads), radii ladder 6-10-12-16-24-32-44-pill, hairlines `inset 0 0 0 1px rgba(255,255,255,.08–.18)`. [S4]
- **Background craft is the product:** hero = WebGL pink light-ribbon + black "bowl" alpha overlay + sparse particle canvas + 93px bottom fade; footer = WebGL glowing ring (cropped tail); pricing card = WebGL canvas; plus progressive 8-layer bottom blur, edge-masked infinite marquees, pink hover bloom (`filter:blur(100px)`), glass pills with 1px chrome rim. [B `#hero`, `.footTail`, `.priceCard`; S4 `.bottomBlur`, `.marquee`, `.newsGlow`; S3 `.bg-floater`]
- **For Rhea Strip:** keep the void + pink + serif-italic accent, add one cool "ice" counter-accent (derived from the chrome rim glow `#B3F4FF`) so **YT = pink (heat/yield), PT = ice (stability/principal)**; replace the three WebGL canvases with CSS/SVG/canvas-lite (the snapshot's own poster fallbacks prove the look survives without GL); Inter tabular numerals for all figures. Ready-to-paste `:root` + Tailwind v4 `@theme` below.

---

## Findings

### 1. Colour tokens

**Declared custom properties** (the only theme variables in the page):

| Token | Value | Where | Source |
|---|---|---|---|
| `--hv-pink` | `#FE3D70` | page root inline style; `.pink`, `.eyebrow`, `.progress`, `.sparkle`, `.newsGlow`, `.newsBtn`, `.btnWhite:hover` | B first `<div class=page style=...>`; S4 |
| `--hv-bg` | `#000` | `.page{background}` | same |
| `--hv-serif` | `"editorsNote","editorsNote Fallback",Georgia,Times New Roman,serif` | `.serif .serifMedium .price` | S5 |
| `--hv-outfit` / `--hv-inter` | `"outfit"…` / `"inter"…` | `.faqA p` / `.newsInput .newsBtn .footer` | S5, S4 |
| `--sf-img-24…148` | 25 AVIF data URIs | SingleFile artifact, **ignore** | S1 |
| Tailwind `--tw-*`, `--font-sans` | defaults | reset only | S3 |

`<body>` has inline `background-color:#010101;color:#fff` (outside the `.page` wrapper, which is `#000`) [B `<body style>`]. No `prefers-color-scheme`, no `data-theme`, no light values anywhere → **dark only** (0 matches in all `<style>` blocks).

**Literal palette actually used** (hex-alpha as written; alpha% = byte/255):

| Role | Value (alpha) | Used in |
|---|---|---|
| Ink 0 (page) | `#000` | `.page`, `.card`, `.priceCard`, `.heroFade`, `.footTailShade`, `.unlockShade`, `.unlock:after` |
| Ink body | `#010101` | `<body>` inline |
| Ink card/navy-black | `#030611` | `.colCard` bg, `.colShade` end, **button label colour** `.btnWhite/.btnSparkle` |
| Ink deep | `#040611` | `.problemIcon` radial end |
| Glass ink | `#121214` @55% (`#1212148c`), @85% (`#121214d9`) | `.nav`, `.mobileMenu` |
| Pill ink | `#28282c` @60% (`#28282c99`) | `.cursorPill` |
| Scrim | `#000` @26% (`#00000042`), @25% (`#00000040`), @45% (`#00000073`), @20% (`#0003`) | `.sideNav`, `.arrow`, `.arrow:hover`, `.dots` |
| Pink (brand) | `#FE3D70` | see tokens above |
| Pink hover | `#FF5280` | `.newsBtn:hover` |
| Pink icon | `#F7225B` | 3 duotone problem icons (`fill=#F7225B`) |
| Pink focus (global) | `#E74C6F` | `:focus-visible{outline:2px solid #e74c6f}` [S3] |
| Pink glow | `#FF3C71` @30% (`#ff3c714d`) | `.btnWhite:hover` box-shadow `0 10px 22px` |
| Pink wash | `#FF3D71` @30% (`#ff3d714d`) / @35% (`#ff3d7159`) → `#ff3d7100` | `.problemIcon` radial; `.news` mobile radial |
| White text ladder | `#fff` 100 · `#fffc` 80 · `#ffffffb8` 72 · `#ffffffa6` 65 · `#fff9` 60 · `#ffffff80` 50 · `#ffffff73` 45 · `#fff6` 40 | h1/h2 · `.heroSub .problem p .notAnymore` · `.faqA p` · `.navLinks a` · `.newsSub` · `.footDesc .footLink` · placeholder, sideNav tick · `.footCopy .mustBuyLead .sideNav a` |
| Footer by-line link | `#b3b3b3` → `#fff` | `.footBy a` |
| White fill ladder | `#ffffff05` 2 · `#ffffff0d` 5 · `#ffffff14` 8 · `#ffffff1a` 10 · `#ffffff1f` 12 · `#fff3` 20 | `.news` bg · `.newsInput` bg · `.card` hairline · glass buttons/`.faqItem` hairline/`.burger` · `.gl-btn:hover` · `.btnGlass:hover` |
| Hairline ladder | 8% `#ffffff14` (card) · 10% `#ffffff1a` (faq) · 14% `#ffffff24` (news) · 18% `#ffffff2e` (unlock) · 26% `#ffffff42` (faq hover) · 30% `#ffffff4d` (input focus) · 35% `#ffffff59`→100% `#fff` (btnGlass inset top highlight) | |
| Chrome-rim neutrals | `#eff3f5 #ababab #4d4d4d #666 #b5b5b5 #fbffff`; fill `#5c5c5c66→#383838`; inset `#707070`; ring `#334047`; **cool bloom `#b3f4ff26`**; drop `#0c101433` | `.bg-floater-*` [S3] |
| Focus ring (page) | `#fffc` 2px, offset 3px | `.page :focus-visible` [S4] |

**Hero imagery palette** (measured from the embedded poster fallbacks, 6 and 8-colour quantisation, `Img`):
- Hero poster (WebP 960×600, 3.4 KB): `#340613 #520828 #770C46 #991D64 #CA5995 #E18FB4` — a magenta ramp, light ribbon top-left sweeping down-right on near-black.
- Footer poster (WebP 1200×196, 2.5 KB): `#090308 #502349 #874679 #B859B1 #BD8FB7 #ECA2EB #F6DDF6` — a violet-magenta glowing ring with a white-hot core.

**Where colour is used:** pink only appears as (a) italic serif accent words, (b) eyebrow labels, (c) scroll-progress bar, (d) hover states (button, glow, input CTA), (e) icon fills, (f) background imagery. Surfaces and borders are 100% neutral. This 90/10 discipline is the system's identity.

### 2. Typography

**Families** (all self-hosted, **embedded as base64 `font/woff2`** in the snapshot, i.e. no Google Fonts request in the original): [S5, S6]

| Family | Weights/style | Embedded size (raw) | Role | Public equivalent |
|---|---|---|---|---|
| **Satoshi** | 400, 500, 700 normal | 25.5 / 25.6 / 25.3 KB | body + all headings (`.page`, `<body>` inline) | Fontshare (self-host woff2); not on Google/fontsource |
| **Editor's Note** (`editorsNote`) | 400 italic, 500 normal, 500 italic | 18.5 / 17.5 / 18.8 KB | italic serif accent words (`.serif` = 400 italic, `.serifMedium` = 500 italic, `.price` = 500 italic) | Pangram Pangram (paid); stand-in `Instrument Serif` italic |
| **Outfit** | 400 | 14.1 KB | FAQ answers only | `@fontsource/outfit` |
| **Inter** | 400–600 variable | 48.4 KB | footer, newsletter input/button | `@fontsource-variable/inter` |
| **Geist** | 500 | 13.3 KB | floating CTA label only (`.bg-floater`) | `geist` package / Google |

Total 9 woff2 files = 207 KB raw. Every `next/font` face ships a metrics-matched fallback (`size-adjust`/`ascent-override`, e.g. inter 107.89 %/89.79 %/22.36 %, outfit 100.06 %/99.94 %/25.98 %, editorsNote 86.01 %/120.92 %/27.9 %, geist 108.87 %/92.31 %/27.1 %) to prevent layout shift [S5].

**Global text rules:** `-webkit-font-smoothing:antialiased`; `h1,h2,h3{text-wrap:balance}`; `p,li{text-wrap:pretty}` (the `.page` scope resets to `text-wrap-style:auto`) [S3, S4]; `.page` hides the scrollbar (`scrollbar-width:none`) while `html{scrollbar-gutter:stable}` [S3, S4].

**Type scale (desktop ≥1200px)** — size/line-height, tracking is always **−0.02em** except where noted:

| Style | px / px | Weight | Tracking | Class |
|---|---|---|---|---|
| Display H1 | 80 / 88 (ratio 1.10) | 400 | −1.6px | `.h1`, `.statementText` (max 1000 / 1200) |
| Mega title | 88 / 70.4 (0.80, 2-line) | 700 | −1.76px | `.meetTitle` |
| H2 section | 48 / 52.8 (1.10) | 400 | −0.96px | `.h2` (margin-top 10) |
| Price | 48 / 52.8 | 500 italic serif | −0.96px | `.price` |
| Title L | 40 / 48 (1.20) | 500 | −0.8px | `.unlockTitle` |
| Card title | 32 / 35.2 (1.10) | 400 | −0.64px | `.cardTitle` |
| Newsletter title | 32 / 38.4 (1.20) | 500 | −0.64px | `.newsTitle` |
| Lead | 28 / 30.8 | 400 | −0.56px | `.moreSoon` (gradient text) |
| Sub-head | 24 / 26.4 (1.10) | 500 | −0.48px | `.colName .priceList li .mustBuyLead .rolesTrack span` |
| Pill text | 24 / 28.8 | 400 | 0 | `.notAnymore` |
| Lead small | 20 / 24 (1.20) | 400 | 0 | `.heroSub .problem p` |
| Button | 20 / 24 | **700** | −0.4px | `.btn` |
| FAQ question | 20 / 26 | 500 | 0 | `.faqBtn` |
| Body S | 18 / 21.6 (1.2) | 500 | −0.36px | `.newsSub` |
| Floater | 17 / 1.2 | 500 | −0.34px | `.bg-floater-label` |
| FAQ answer | 16 / 28 | 400 (Outfit) | 0 | `.faqA p` |
| Footer text | 15 / 24 | 400 | 0 | `.footDesc` |
| UI small | 14 / 15.4–18.2 | 400/500/600 | 0 (count −0.28px) | `.navLinks a .footLink .footHead .newsInput .colCount` |
| Nav CTA | 13 / 13 | 500 | 0 | `.navCta` |
| Eyebrow | 14 / 15.4, **uppercase, 700, tracking 4.2px (0.3em)**, pink | 700 | +4.2px | `.eyebrow` (mobile 10/11, 3px) |

Mobile (≤809.98px): H1 stays 80/80 (`overflow-wrap:anywhere`), H2 24/26.4, statement 24/33.6, meet title 38/30.4, price list 16/17.6 [S4 `@media (max-width:809.98px)`]. At 810–1199px: H1 line-height 72, statement 56/61.6, meet title 72/57.6 [S4 `@media (max-width:1199.98px)`].

**Headline device:** one word (or the key phrase) set in `.serif` (italic 400) / `.serifMedium` (italic 500) inside a sans headline, usually also `.pink` — e.g. h1 "Jaw-dropping *backgrounds* for your projects"; statement: pink serif words "backgrounds / personal / client / projects" [B `.h1`, `.statementText`]. Word-by-word reveal: every word is `<span class="word">` (`display:inline-block; will-change:transform,filter,opacity`) whose resting inline style is `opacity:1;filter:blur(0px);transform:none` (40 spans) [S4 `.word`; B].

### 3. Spacing, radii, shadows, borders

**Spacing values in use (px):** 4, 6, 8, 10, 12, 14, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 80, 84, 96, 107, 120, 152, 288. The structural rhythm is:
- Section vertical padding **120px** (`.usecases .collections .statement .faq-top`), 96 (`.newsWrap` top), 152 (`.unlockWrap` top), tablet 32px horizontal, mobile 16px.
- Heading → content gap **84px** (`.problemGrid .bento .colGrid .faqList` all `margin:84px auto 0`; mobile 56 / FAQ 48).
- Eyebrow → H2 = 10px; H2 → content within hero stack: h1 16, sub 24, buttons 40.
- Grid gaps: bento 10, collections 16, marquee tiles 10 (row gap 17 desktop / 10 mobile), faq list 12, price list 24, buttons 10.
- Horizontal page padding 120 (≥1200) → 32 (tablet) → 16 (mobile); newsletter/unlock wrappers 288 → 32 → 16.

**Radii ladder:** 4 (global focus ring) · 6 (`.nav` logo, `.sideNav` collapsed, hero logo) · 10 (`.newsInput .newsBtn .siteTile .vaultTile`) · 12 (`.tile .dropA-C .sideNav` expanded) · 16 (`.problemIcon .faqItem .bannerStage`) · 24 (`.colCard .mobileMenu`) · **32** (`.card .priceCard .unlock .news`) · 44 (`.nav`) · 46 (`.navCta`) · 100–106–200 (pills: `.cursorPill`, `.bg-floater` 106, `.btn` 200, `.notAnymore` 200) · 50% (arrows, dots, burger, newsGlow).

**Shadows / borders (no CSS `border` on cards — hairlines are inset box-shadows):**

| Recipe | Value | Used |
|---|---|---|
| Card hairline | `inset 0 0 0 1px #ffffff14` | `.card` |
| FAQ row | `inset 0 0 0 1px #ffffff1a`, hover `#ffffff42` (transition .3s) | `.faqItem` |
| Unlock card | `0 0 0 1px #ffffff2e` | `.unlock` |
| Newsletter | `inset 0 0 0 1px #ffffff24` on `#ffffff05` | `.news` |
| Input | `inset 0 0 0 1px #ffffff0f` → focus `#ffffff4d` (.16s) | `.newsInput` |
| Glass button | `inset 0 .5px #ffffff59`, hover `inset 0 .5px #fff` | `.btnGlass` |
| Primary hover bloom | `0 10px 22px #ff3c714d` | `.btnWhite:hover` |
| Floating nav | `0 12px 40px #00000073` | `.nav .mobileMenu` |
| Chrome CTA | `0 0 0 .5px #334047, 0 5px 10px #0c101433, 0 -6px 12px -6px #b3f4ff26` | `.bg-floater-body` |
| Chrome fill inner | `inset 0 10px 10px -5px #707070`; shine `inset 0 -2px 6px 2px #ffffff1a` | `.bg-floater-fill/-shine` |
| Text shadows | `0 1px 5px #0000005e` (`.meetTitle`), `0 1px 2px #00000040` (`.price`), `0 1px 3px #0c101426` (floater label) | |
| Focus ring | page: `2px solid #fffc`, offset 3; global: `2px solid #e74c6f`, offset 2, radius 4; collection card `0 0 0 2px #fff`; floater ring `2px solid #ffffffb3` offset 3 | S4, S3 |

### 4. Grid, containers, breakpoints

- **Breakpoints (max-width, Framer-style .98 values):** `1199.98px` (tablet, ≥1200 = desktop) and `809.98px` (mobile, ≥810 = tablet). Only these two + `prefers-reduced-motion`. In Tailwind terms: `md = 810px`, `xl = 1200px`. [S4 last 3 `@media`]
- **Container max-widths:** 1200 (`.bento .priceCard .colGrid .statementText`), 1104 (`.problemGrid`), 1000 (`.h1`), 960 (`.meetCopy`), 864 (`.unlock .news`), 800 (`.faqList`), 746 (bento/news on tablet), 682 (faq tablet), 712 (`.unlockTitle`), nav is `width:auto` pill, mobile menu `min(358px,100vw − 32px)`.
- **Bento:** `grid-template-columns:474px 232px 474px; grid-template-rows:326px×3; gap:10px` with areas `cPresent 1/1/auto/3`, `cWall 1/3`, `cSocial 2/1/4`, `cBanner 2/2/auto/4`, `cSites 3/2/auto/4`; tablet columns `292/142/292` (max 746); mobile becomes a flex column with fixed card heights 275/322/534/256/288 and gap 24.
- **Collections grid:** `repeat(3,1fr)` gap 16 (tablet `repeat(3,240px)` centred, mobile `1fr`), cards h208.
- **Hero:** `height:100vh` (76vh ≤1199), content centred in a column, z-index stack 1–5 (see §5). Hero showcase layer `width:116%; left:-8%; height:940px; top:304px` (88 tablet, 45 mobile).
- **Layering (z-index):** hero layers 1–5, `.bottomBlur` 30, `.sideNav` 40, `.navWrap`/`.bg-floater` 50, `.progress` 60, `.cursorPill` 70 [S4, S3].
- **Chrome positions:** pill nav fixed `top:20px` centred; side nav fixed `left:24px; top:50%` (hidden <1200); floating CTA fixed `bottom:40px` centred; progress bar fixed top, 6px.

### 5. Background techniques (the core of this style)

1. **WebGL shader scenes via Unicorn Studio** (`<canvas aria-label="Unicorn Studio Scene" role=img>` inside `.usLayer`): hero scene `data-scene-id=id-3nih8n2zp7mpe8ws5ehhpi`, backing store 3146×1966 px displayed at 2098×1311 (≈24.7 MB of pixels), footer scene `id-tsnrp9wdec2pdwrm0om1m` 5948×760 shown at 3966×507 (≈18 MB). Each has a `.usPoster` static fallback (WebP, 3.4 KB / 2.5 KB) that cross-fades out over **0.9s** (`.usPoster` / `.usCanvas` `transition:opacity .9s`, state via `data-shown`). Canvas is sized "cover" in a `container-type:size` box: `width:max(100cqw,160cqh); height:max(100cqh,62.5cqw)` centred. The snapshot's canvas PNGs are fully transparent (WebGL not captured), so **shader code is not recoverable from the file**; the look is documented by the posters (magenta ribbon hero, violet ring footer). A third canvas (`.priceCard canvas`, 600×338 backing) is also GL/2D; its content is not recoverable. [B `.heroUs .usCanvas`, `.footUs`, `.priceCard canvas`; S4 `.usLayer .usPoster .usCanvas .heroUs`; Img webp ×2, png ×3]
2. **Alpha "bowl" overlay for legibility:** `.heroShowcase` is a 1000×621 **pure-black (RGB 0,0,0) AVIF with an alpha gradient** (1.6 KB): transparent along the top edge and lower corners, ~89–100 % opaque in the lower-centre. It is stretched to 116 % width / 940 px height and masked with `mask-image:linear-gradient(#0000 0,#000 220px)`. This darkens the area behind the headline so text sits on black while the ribbon glows at the top edge. Followed by `.heroFade` (93px `linear-gradient(#0000,#000)` into the next section). [B `img.heroShowcase`, `.heroFade`; S4 `.heroShowcase .heroFade`; decoded Img: alpha mean 0.61]
3. **Sparse particle canvas ("freckles"):** `canvas.freckles` full-bleed above the showcase (z4), 1836×1311 backing; the captured frame has ~0 % opaque pixels (a few specks), i.e. a handful of tiny drifting dots. [B `.freckles`; S4]
4. **Progressive (variable) blur:** `.bottomBlur` is a fixed 132px strip of **8 stacked `backdrop-filter` layers**, each masked to a 12.5 % band: blur `.5, .828, 1.656, 3.313, 6.625, 13.25, 26.5, 53 px`, masks e.g. `linear-gradient(#0000 0%,#000 12.5% 25%,#0000 37.5%)` shifted by 12.5 % per layer. Result: content dissolves into the viewport bottom. [S4 `.bottomBlur > div:nth-child(1–8)`]
5. **Edge-fade masks:** marquees `mask-image:linear-gradient(90deg,#0000 0%,#000 12% 88%,#0000 100%)`; roles ticker vertical `linear-gradient(#0000 0%,#000 23.5% 76.5%,#0000 100%)`; hero showcase top mask; `.wallTopShade`, `.unlockShade` (`linear-gradient(#0000 -16%,#000 80%)`, h124), `.colShade` (`#03061200 → #0306123b 23.4% → #030611`, h104), `.footTailShade` (`#000→#0000`, h148). [S4]
6. **Glass:** `backdrop-filter` blur 22px (nav, mobile menu), 12px (`.notAnymore`), 10px (side nav, cursor pill, floater), 6px (arrows). Tints: `#1212148c`, `#ffffff1a`, `#00000042`, `#28282c99`. [S4, S3]
7. **Chrome rim ring:** 1px gradient ring using the mask-composite XOR trick — `.bg-floater-rim{background:linear-gradient(#eff3f5 0%,#ababab 23.87%,#4d4d4d 45%,#666 64.74%,#b5b5b5 85.44%,#fbffff 100%);padding:1px;inset:0;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}` over a blurred `linear-gradient(#5c5c5c66,#383838)` fill and a `linear-gradient(#fff0,#ffffff1a 62.4%,#ffffff4d)` shine. [S3 `.bg-floater*`]
8. **Pink bloom:** `.newsGlow` = 408×267 ellipse `background:#FE3D70; filter:blur(100px); opacity:0 → 1` on `.news:hover` (.6s); mobile replaces it with a static `radial-gradient(120% 100% at 100% 0,#ff3d7159 0%,#ff3d7100 60%)`. `.statement` has a 1440×1142 raster `.glow` (decorative, AVIF) at `top:-319px;left:-274px` (mobile 1100 wide). `.problemIcon` uses `radial-gradient(50% 50% at 50% 0,#ff3d714d 0%,#040611 100%)`. [S4]
9. **Gradient text:** `.moreSoon{background:linear-gradient(#fff 0%,#fff0 100%);-webkit-background-clip:text;color:transparent}`. [S4]
10. **Raster-first imagery:** 199 AVIF thumbnails (mostly 384×215 ×53, 384×213 ×19, 640×359/358 ×36, 256×143 ×11), 1.37 MB decoded, shown as r12 tiles in marquees, `object-fit:cover`; hover zoom `scale(1.04)` (collection cards, .5s). No `mix-blend-mode`, no SVG filters, no `noise/grain` layer: the film grain feel is in the source images/shaders only. [S4 `.tile .colCard`; Img]

### 6. Components

**Nav (floating pill).** `.navWrap` fixed top:20, centred, `pointer-events:none`; `.nav` = `inline flex, gap:36, padding:10 10 10 22, radius:44, bg #1212148c, blur 22, shadow 0 12px 40px #00000073`. Logo 22×22 r6; links 14/14 `#ffffffa6` (hover `#fff`, .3s), gap 28 (18 tablet); two CTAs 33px tall: `navSignIn` (`#ffffff1a`, white text) and `navGet` (`#fff` bg, `#000` text), `radius 46, padding 0 20, 13/13, 500`, `:active scale(.97)`, transition `background-color .16s, transform .12s`. Mobile: links hidden, 33px circular burger (`#ffffff1a`), dropdown `.mobileMenu` (blur 22, `#121214d9`, r24, p12, gap4, width `min(358px,100vw−32px)`, closed state `opacity:0; visibility:hidden; translate(-50%,-8px)`, transition `opacity .2s, transform .25s cubic-bezier(.22,1,.36,1)`). [S4 `.nav*`, `.burger`, `.mobileMenu`; B `nav.navWrap`]

**Side nav (section dots).** Fixed-left vertical list of 12×1px ticks that expand on hover/focus-within into labelled links: bg `#00000042 → #000`, radius 6→12, padding 8→12/16, row height 14→29, label `max-width 0→120`, transitions .2–.3s. Hidden ≤1199. [S4 `.sideNav*`]

**Buttons.** `.btn` = 48px high, radius 200, padding 0 20, 20/24 **700**, tracking −0.4px, `inline-flex`, transition `transform .16s cubic-bezier(.22,1,.36,1), background-color .3s, color .3s, box-shadow .3s`, `:active scale(.98)`.
- `btnWhite` bg `#fff`, label `#030611`; hover → bg pink `#FE3D70`, label `#fff`, shadow `0 10px 22px #ff3c714d`.
- `btnGlass` bg `#ffffff1a`, `inset 0 .5px #ffffff59`; hover bg `#fff3` + `inset 0 .5px #fff`.
- `btnSparkle` (pricing) = white pill + hidden pink sparkle icon (24px, `max-width 0 → 24`, `margin-right 0 → 10`, opacity 0→1, .35s `cubic-bezier(.22,1,.36,1)`) revealed on hover/focus-visible.
- `bg-floater` = fixed chrome CTA (see §5.7): 48px high, padding 0 40, label Geist 17px/500 `#fff` with 0 1px 3px shadow; hover adds `::after` `#ffffff14` overlay (.18s); active body `scale(.98)`; enters with `transform .45s cubic-bezier(.22,1,.36,1), opacity .3s` (`data-visible`).
- Icon buttons: `.arrow` 40×40 circle `#00000040` blur 6, hover `#00000073`, active `scale(.94)`; `.burger` 33×33; carousel dots 20×30 hit area / 8px visible `#ffffff80`, current `#fff` + `scale(1.1)`. [S4 `.btn*`, `.arrow`, `.dot*`; S3 `.bg-floater*`]

**Cards.** `.card` = `#000`, radius **32**, `overflow:hidden`, hairline `inset 0 0 0 1px #ffffff14`; title absolute `top:24 left:24` 32/35.2 white. Variants: `.colCard` r24 h208 `#030611` with gradient shade + bottom-left label (name 24/26.4 500, count 14/15.4), image `scale(1.04)` on hover (.5s), `:active scale(1.02)`, focus `0 0 0 2px #fff`. `.problem` = 201px column: 64×64 r16 icon tile with pink radial + 32px duotone icon + 20/24 `#fffc` text. `.priceCard` r32, h675 (581 mobile), canvas fill + centred 230px stack (price 48 serif, 7-row checklist 24/26.4 with 20px check icon, gap 24, CTA). `.unlock` r32 max 864 h530 with 3 muted marquee rows behind, shade, logo + 40/48 title + CTA. [S4]

**Tags / pills.** `.notAnymore` = glass pill (`#ffffff1a`, blur 12, r200, 12 24, 24/28.8 `#fffc`); `.cursorPill` = custom cursor label ("View collection", `#28282c99`, blur 10, r100, 10 18, 14px, follows pointer; `.colGrid{cursor:none}` ≥810px). [S4]

**Forms.** Newsletter only: `.newsInput` 257×40, r10, bg `#ffffff0d`, text `#fff` Inter 400 14/1, no outline, hairline `#ffffff0f` → focus `#ffffff4d` (.16s), placeholder `#ffffff73` (45 %), padding 0 12; `.newsBtn` 92×40 r10 pink bg, Inter 600 14/16.8, hover `#ff5280`, active `scale(.97)`, disabled `opacity:.6;cursor:default`; form gap 20 (16 mobile, input `flex:1`). `type=email required autocomplete=email aria-label`. [S4 `.newsForm .newsInput .newsBtn`; B form]

**Accordion (FAQ).** `h3 > button.faqBtn` (full width, 25/24 padding, 20/26 500, chevron 20px, `aria-expanded`, `aria-controls=hv-faq-N`) + `div.faqA[role=region]` using **`display:grid; grid-template-rows:0fr; transition:grid-template-rows .35s cubic-bezier(.22,1,.36,1)`** (open state `1fr` is set by JS inline; not in CSS) around an `overflow:hidden` child. Chevron rotates with `transition:transform .3s cubic-bezier(.22,1,.36,1)`. Row r16 with hairline (hover brightens `.1 → .26`, .3s). Items in a 12px-gap column max 800. [S4 `.faq*`; B `#faq`]

**Marquee.** `.marquee` (overflow hidden + edge mask) > `.track` (`width:max-content; display:flex; animation:hv-marquee var(--dur) linear infinite; will-change:transform`) > two `.trackGroup` (second `aria-hidden`, `gap:10; padding-right:10`) so `translateX(0 → −50%)` loops seamlessly; `data-dir=right` sets `animation-direction:reverse`; `data-paused=true` → `animation-play-state:paused` (SSR default; JS flips when in view). Row durations (`--dur`): 64.3s, 176.9s, 53.7s, 72.4s (hero reel), 55.2s (sites), 26.4s/39.6s/39.6s (vault) — duration is derived from track width, not fixed. [S4 `.marquee .track`; B inline `--dur`]

**Carousels / rotating text.** Wallpaper slider: 10 absolutely stacked slides `opacity .6s, transform .9s cubic-bezier(.22,1,.36,1)` (inactive `opacity:0; scale(1.04)`), arrows + 10 dots. Banner crossfade: 3 frames `animation:8.1s ease-in-out infinite hv-banner` (delays 0 / 2.7 / 5.4s; keyframes `0% opacity0 blur(8px) · 5–28% opacity1 blur() · 33–100% opacity0 blur(8px)`). Role ticker: `7.5s cubic-bezier(.7,0,.3,1) infinite hv-roles`, steps `translateY 0 / −47 / −94 / −141px`, held 26 % each. [S4 `.wallSlide`, `@keyframes hv-banner`, `hv-roles`]

**Social "burst" card.** On `:hover` four logo images translate out by per-element `--dx/--dy` (e.g. `--dx:-120.5px; --dy:-156.5px`, `--s:75px`) with `transition:transform .5s cubic-bezier(.34,1.3,.64,1)` (overshoot), phone mockup blurs and shrinks `translateY(128px) scale(.764); filter:blur(5px)` (.45s); mobile scale factor `--k:.755`. [S4 `.cSocial .socialIcon .phone`]

**Footer.** `.footer` Inter, `padding:80 80 60` (40 tablet): brand column 320 (logo 210×29, desc 15/24 `#ffffff80`, "Created by" 14px `#fff6` with link `#b3b3b3`→`#fff`), four link columns (heads 14/16.8 500; links 14/18.2 `#ffffff80`→`#fff` .3s; gap 16), bottom bar `margin-top:64` copyright 14px `#fff6` + 3 text social links (gap 32). Below the footer: `.footTail` (h300, glowing-ring shader, 216 % wide, mask `footTailShade`) and the `.bottomBlur`. [S4 `.foot*`; B `footer`]

**Not present:** modals/dialogs, tables, toasts, badges beyond pills, selects, tooltips, tabs, skeleton screens (apart from unused keyframes). The CSS also contains **orphan classes from a different tool** (`gl-btn`, `gl-dt-btn`, `gl-img-btn`, `gl-wn-*` keyframes, `.dialkit-preset-confirm`, `bg-ticker-scroll`, `bg-page-mount`, `shimmer`) — the Gradient Lab app bundle; none are used by DOM nodes on this page (grep in `<main>` = 0) [S3]. They are usable as motion hints only (see §8).

### 7. Interaction states

| State | Pattern (value) | Source |
|---|---|---|
| Hover (text links) | colour `#ffffffa6 → #fff` / `#ffffff80 → #fff`, `.3s` | `.navLinks a`, `.footLink` |
| Hover (primary btn) | bg white → pink, label → white, glow `0 10px 22px #ff3c714d` | `.btnWhite:hover` |
| Hover (glass) | fill 10 % → 20 %, top highlight 35 % → 100 % | `.btnGlass:hover` |
| Hover (card) | image `scale(1.04)`, `.5s` ease-out-expo; FAQ hairline `.10 → .26`; newsletter glow in (`.6s`) + bg `#ffffff05 → #fff0` + three images rotate (`-9° → -17°`, `8° → 18°`, `-5° → -15°`, `.7s cubic-bezier(.34,1.2,.64,1)`) | `.colCard`, `.faqItem`, `.news` |
| Hover (nav side) | expand + labels | `.sideNav` |
| Active/press | `scale(.98)` buttons, `.97` nav CTA/newsBtn, `.94` icon buttons/arrows, `.99` Gradient-Lab primary, collection card press `scale(1.02)` (image) | `.btn:active`, `.navCta:active`, `.arrow:active` |
| Focus-visible | page: `outline:2px solid #fffc; outline-offset:3px`; global: `#e74c6f` 2px/offset 2 (radius 4); card `0 0 0 2px #fff`; floater `2px #ffffffb3` offset 3; accordion/collection reveal sparkle on `:focus-visible` as on hover | S3, S4 |
| Disabled | `.newsBtn:disabled{opacity:.6;cursor:default}`; Gradient Lab selectors use `:not(:disabled)` guards | S4, S3 |
| Open/closed | `data-open`, `aria-expanded`, `grid-template-rows 0fr↔1fr`; mobile menu `data-open=false → opacity 0, visibility hidden, translateY(-8px)` | S4 |
| Loading | none visible. Orphan: `@keyframes shimmer{0%{background-position:-200% 0}to{200% 0}}`, `gl-wn-pulse` (opacity 1 ↔ .45), `gl-img-spin` (rotate 360°) | S3 |
| Reduced motion | `@media (prefers-reduced-motion:reduce)`: marquees, roles, banner → `animation:none`; social/phone/drops/sparkle/newsGlow/wall slides/faq/chevron/colCard img/usCanvas → `transition:none`; banner shows frame 1 only; floater drops its transform and keeps `opacity .2s` | S4 end, S3 `.bg-floater` |

### 8. Motion

**Durations (ms) in use:** 120, 160, 180, 200, 250, 300, 350, 450, 500, 600, 700, 900 + long loops 7.5 s, 8.1 s, 26–177 s.
**Easings (exact):**
- `cubic-bezier(.22,1,.36,1)` — **house easing** (ease-out-expo-like), 10 uses: buttons, FAQ grid, chevron, sparkle reveal, wall slides, colCard zoom, mobile menu, phone, floater enter.
- `cubic-bezier(.34,1.3,.64,1)` (social icon burst, overshoot) and `cubic-bezier(.34,1.2,.64,1)` (newsletter image tilt, mild overshoot).
- `cubic-bezier(.7,0,.3,1)` — role ticker (ease-in-out-expo).
- `ease-out` (.16 s floater body, .18 s overlay), `ease-in-out` (banner), `linear` (marquee), `ease-in` (`body{transition:opacity ease-in .2s}` page fade).

**Keyframes inventory:** `hv-marquee` (translate 0 → −50 %), `hv-roles` (4 stops, 7.5 s), `hv-banner` (opacity+blur 8px), `bg-page-mount` (opacity 0→1), `bg-ticker-scroll` (translate 0 → −50 %), plus Gradient-Lab orphans `gl-hint-in` (`translate(-50%,6px)` → rest, opacity 0→1), `gl-wn-fade-in/out`, `gl-wn-pop-in` (`scale(.96) translateY(4px)` → 1, opacity 0→1), `gl-wn-pop-out` (→ `scale(.97)`, opacity 0), `gl-wn-ink`, `gl-wn-melt`, `gl-wn-orbit` (rotate −40° → 130°), `gl-wn-family`, `gl-img-in` (translateY −4px → 0), `gl-img-spin`, `shimmer` [S3, S4]. Their durations are not in the CSS (set in JS) → Assumption.

**JS-driven (inferred from DOM state, code stripped):** scroll progress bar (`.progress` 6px pink, `transform-origin:0`, inline `transform:none` ⇒ `scaleX` progress), per-word headline reveal (blur/opacity/translate), staggered block reveal (`heroBtns`, `problem`, 5 `opacity:1;transform:none` wrappers), Lenis smooth scroll (`html.lenis`), marquee play/pause on visibility (`data-paused`), custom cursor pill, FAQ open/close, Unicorn Studio scene init, wallpaper slider autoplay. [B inline styles; S3 `html.lenis`]

### 9. Page structure and shared chrome

Order (all in one `<main>`, anchor-linked): [B]
1. **Chrome:** `.progress` (fixed 6px pink bar) → `nav.navWrap` (Home · Usecases · Discover · Pricing · Freebies · Blog · Gradient Lab · Sign in · Get now) → `nav.sideNav` (Intro · Usecases · Pricing · Collections · FAQs).
2. `#hero` — shader bg + bowl + freckles + 123px icon + H1 + sub (20/24) + 2 CTAs ("Get Now" white, "Explore" glass).
3. `#problems` — eyebrow + H2 + 3 problem tiles (icon tile + one line).
4. `#scroll1` ".meet" (800px) — 4 counter-moving image marquees with centred overlay: pill "Not anymore" + 88px bold "Meet / Backgrounds Supply".
5. `#usecases` — eyebrow + H2 + 5-card bento (Presentations, Wallpapers slider, Social Media burst, Banners crossfade, Websites and Apps marquee).
6. `#pricing` — one r32 card, canvas bg, "for *49$*", 7-line checklist, sparkle CTA.
7. `#collections` — eyebrow + H2 + 27 image cards (3-col) + "More coming soon…" gradient text, custom cursor.
8. `#scroll2` statement — 80px sentence with pink serif keywords + rotating role line.
9. `#faq` — 10 accordion rows (+ FAQPage JSON-LD).
10. Final CTA (`data-track-section=final-cta`) — `.unlock` vault card with 3 marquees.
11. Newsletter card (`.news`).
12. `footer` + `.footTail` shader + `.bottomBlur` + floating `bg-floater` ("Get it for $49").

Section header pattern repeated 4×: `eyebrow` (uppercase pink, 14px/4.2px) + `h2` 48/52.8 centred + 84px gap. Background of every section is pure `#000`, separation comes only from spacing and the imagery, never from dividers or alternating bands. SEO: 4 JSON-LD blocks (Organization, WebSite, Product, FAQPage), full OG/Twitter 1200×630, `<link rel=canonical>`. Security meta CSP present only because of SingleFile. [M, B]

### 10. Assets

| Asset | Count / size | Notes |
|---|---|---|
| woff2 fonts | 9 files, 207 KB raw | see §2 |
| AVIF images | 199 data URIs, 1.37 MB raw; mostly 384×215 | Next/Image `srcset`; gradient/AI backgrounds — **content, not reusable** |
| PNG | 5, 431 KB raw: favicon 344×344 (149 KB); 3 canvas snapshots (3146×1966, 5948×760, 600×338 — **fully transparent**); freckles 1836×1311 (near-empty) | canvases carry no shader source |
| WebP posters | 960×600 (3.4 KB), 1200×196 (2.5 KB) | hero / footer fallback |
| SVG (data) | 2× Unicorn Studio badge, 17.8 KB each | third-party badge, do not copy |
| SVG placeholders | 28 inline `<svg><rect fill-opacity=0>` (lazy `img` sizers) | n/a |
| Inline SVG icons | 51 `<svg>` in `<main>`, **Phosphor**-style: 10× caret-down (256 viewBox, `fill rgb(78,78,78)`), 7× check (256, `fill #fff`), 2× arrows (40 viewBox, stroke 2 round), burger, sparkle, 3× duotone 32px problem icons (pink `#F7225B`) | brand logos are AVIF rasters, not SVG |

Key reusable icons (verbatim):
```html
<!-- check (Phosphor bold, 256) -->
<svg viewBox="0 0 256 256" fill="#fff"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg>
<!-- caret-down (Phosphor regular, 256) -->
<svg viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>
<!-- sparkle (24) -->
<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 1.5c.55 4.9 2.6 6.95 7.5 7.5-4.9.55-6.95 2.6-7.5 7.5-.55-4.9-2.6-6.95-7.5-7.5 4.9-.55 6.95-2.6 7.5-7.5Z"/><path d="M18.5 13c.33 2.95 1.55 4.17 4.5 4.5-2.95.33-4.17 1.55-4.5 4.5-.33-2.95-1.55-4.17-4.5-4.5 2.95-.33 4.17-1.55 4.5-4.5Z"/></svg>
<!-- chevrons 40 (stroke #fff, w2, round) -->
<path d="M22.5 12.5 15 20l7.5 7.5"/>   <path d="M17.5 12.5 25 20l-7.5 7.5"/>
```

---

## Recommendations

### A. What to copy, what to change (Rhea Strip)

1. **Copy verbatim:** void base, white-alpha ladder, hairline-by-inset-shadow, radii ladder, spacing rhythm (120 / 84 / 24 / 10), pill buttons with the white → pink hover, house easing `cubic-bezier(.22,1,.36,1)`, Satoshi + serif-italic accent device, eyebrow labels, glass nav pill, chrome-rim CTA, grid-rows accordion, marquee mechanics.
2. **Change for DeFi:**
   - Add a **second accent for PT**: ice `#B3F4FF` (derived from the only cool value in the source, `#b3f4ff26` in the chrome bloom, plus `#334047`, `#eff3f5`, `#fbffff`). Convention: **PT = ice, YT = pink, underlying (stNEAR) = white**. Use it consistently on chips, chart lines, tile glow, and the PT/YT toggle.
   - **Numbers must not use Satoshi**: use Inter (already in the stack) with `font-variant-numeric: tabular-nums slashed-zero`; keep Satoshi for headings and labels.
   - Status colours do not exist in the source (see Assumptions); add minimal `--rs-ok / --rs-warn / --rs-danger`.
   - **No 80px headline inside the app shell**: use the 48 / 32 / 24 steps; reserve 80/88 for the landing hero only.
   - The pink "hot hover" of the primary button is correct for marketing, but for **transaction buttons** keep the white pill and only add the glow on hover (no colour swap) to avoid reading as an error/destructive state; use pink fill for the single "Strip" action.
   - Drop the WebGL canvases (see techniques below); keep the posters' palette.

### B. Screen mapping

| Rhea screen | Mapping to source patterns |
|---|---|
| **Landing hero** | `heroBg` stack: CSS pink ribbon (technique 1) + black bowl overlay (technique 2) + sparse dots (technique 3). Content: 123px mark → H1 80/88 "Split yield from principal. *Trade* either side." with `.serif.pink` on "yield"/"Trade" → sub 20/24 `#fffc` → CTAs `btnWhite` "Launch app" + `btnGlass` "How it works" (48px, r200). Below: eyebrow + H2 + 3 `problem` tiles (Fixed yield / Sell yield early / Speculate on rates) with pink-radial icon tile; a live-markets marquee (PT/YT tickers) reusing `marquee` mask + `hv-marquee`. Chrome: glass pill nav, progress bar, bottom blur (3 layers), floating chrome CTA "Start stripping". |
| **Deposit / Strip form** | `card` r32 `#000` hairline `#ffffff14`, 24px padding, header 32/35.2. Amount input = `newsInput` recipe at 56px height / r16 / Inter 24 tabular; asset select as `btnGlass` pill (r200). Maturity series as selectable r16 chips (`faqItem` hairline, selected = `inset 0 0 0 1px #ffffff4d` + `#ffffff1a` bg). Output preview: two equal tiles — **PT** (ice number, `#B3F4FF` hairline `.26`) and **YT** (pink number, pink hairline) with maturity pill; arrow glyph between. Primary: `btnWhite` full width 56px "Strip stNEAR"; disabled `opacity:.6`. Step eyebrow "01 SELECT · 02 DEPOSIT · 03 RECEIVE" using `.eyebrow` (pink, 4.2px). |
| **PT/YT markets (swap cards)** | Grid of `colCard` (r24, `#030611`, `colShade`) → market card: title "stNEAR · 30 Jun 2027", `colCount`-style 14px meta (implied APY, TVL, liquidity). Two-column swap card inside `card` r32: "You pay / You receive" rows with `newsInput`-style fields, swap-direction circle button = `.arrow` (40px, blur 6). PT/YT toggle = segmented glass pills (`btnGlass`, active `#fff` bg black label). Price/APY change chip = `notAnymore` pill at 14px. Hover: `scale(1.04)` on art, pink bloom on YT cards, ice bloom on PT cards (technique 9). |
| **Portfolio table + countdown** | No table in source → build from `faqItem` rows: r16, hairline `.10` (hover `.26`), 12px gap, columns Inter 14/16.8, numerals tabular; header row `footHead` style (14/500 `#ffffff80`). Maturity countdown = glass pill (`notAnymore` 16px on mobile) with `HH:MM` digits tabular + a 6px `.progress`-style bar (`transform: scaleX`, pink for YT, ice for PT) showing elapsed term. Expandable row details use the `faqA` grid-rows trick (.35s). Claim/redeem = small `navGet`-style white pill (33px, r46). |
| **Wallet connect modal** | `mobileMenu` recipe scaled up: centred, `width:min(420px,100vw−32px)`, `bg #121214d9`, blur 22, r24, p12, shadow `0 12px 40px #00000073`, enter `opacity .2s, transform .25s cubic-bezier(.22,1,.36,1)` from `translateY(8px)`. Scrim `rgb(0 0 0 / .6)` (not in source). Wallet rows 56px r16, hover bg `#ffffff1a`, hairline `#ffffff14`, 16/500 Satoshi, 24px icon; footer 14px `#ffffff80` legal text. Focus ring `2px #fffc` offset 3. |
| **Toasts** | `cursorPill` recipe: `bg #28282c99`, blur 10, r100, 10 18, 14px white, bottom-centre stack at `bottom:96px` (above the floater); icon dot ice/pink/ok. Enter `gl-hint-in` (opacity 0→1, `translateY(6px)→0`), exit `gl-wn-pop-out` (→ `scale(.97)`, opacity 0). Durations are not in the source: use 250 ms in / 160 ms out. `role=status`, 5 s auto-dismiss, `prefers-reduced-motion` → opacity only. |

### C. Ready-to-paste `globals.css` `:root` token block

```css
/* app/globals.css — Rhea Strip. Values in [src] come from backgrounds.supply S3/S4; [new] are Rhea additions. */
:root {
  color-scheme: dark;

  /* ink / surfaces */
  --rs-ink:        #000000;   /* [src] .page --hv-bg */
  --rs-ink-body:   #010101;   /* [src] <body> inline */
  --rs-ink-card:   #030611;   /* [src] .colCard, button label */
  --rs-ink-deep:   #040611;   /* [src] problemIcon radial end */
  --rs-glass:      #1212148c; /* [src] .nav */
  --rs-glass-menu: #121214d9; /* [src] .mobileMenu */
  --rs-glass-pill: #28282c99; /* [src] .cursorPill */
  --rs-scrim:      #00000073; /* [src] .arrow:hover/.nav shadow tone */

  /* accent: YT / brand (pink) */
  --rs-pink:        #FE3D70;  /* [src] --hv-pink */
  --rs-pink-hover:  #FF5280;  /* [src] .newsBtn:hover */
  --rs-pink-deep:   #F7225B;  /* [src] problem icons */
  --rs-pink-focus:  #E74C6F;  /* [src] :focus-visible */
  --rs-pink-glow:   #ff3c714d;/* [src] btnWhite:hover shadow */
  --rs-pink-wash:   #ff3d7159;/* [src] .news mobile radial */

  /* accent: PT (ice) */
  --rs-ice:         #B3F4FF;  /* [new] from [src] bloom #b3f4ff26 */
  --rs-ice-glow:    #b3f4ff40;/* [new] */
  --rs-ice-wash:    #b3f4ff26;/* [src] .bg-floater-body */

  /* status (not in source) */
  --rs-ok:          #5BE3A0;  /* [new] */
  --rs-warn:        #FFC857;  /* [new] */
  --rs-danger:      #FF5A4E;  /* [new] distinct from brand pink */

  /* text (white alpha ladder) */
  --rs-text:        #ffffff;
  --rs-text-80:     #ffffffcc; /* heroSub, problem p */
  --rs-text-72:     #ffffffb8; /* faq answer */
  --rs-text-65:     #ffffffa6; /* nav links */
  --rs-text-60:     #ffffff99; /* newsSub */
  --rs-text-50:     #ffffff80; /* footer, muted */
  --rs-text-45:     #ffffff73; /* placeholder */
  --rs-text-40:     #ffffff66; /* captions */
  --rs-on-light:    #030611;   /* label on white buttons */

  /* fills + hairlines */
  --rs-fill-2:      #ffffff05;
  --rs-fill-5:      #ffffff0d; /* input */
  --rs-fill-10:     #ffffff1a; /* glass button */
  --rs-fill-20:     #ffffff33; /* glass hover */
  --rs-line-8:      #ffffff14; /* card hairline */
  --rs-line-10:     #ffffff1a; /* row hairline */
  --rs-line-14:     #ffffff24;
  --rs-line-18:     #ffffff2e;
  --rs-line-26:     #ffffff42; /* hover */
  --rs-line-30:     #ffffff4d; /* input focus */

  /* radii */
  --rs-r-xs: 4px; --rs-r-sm: 6px; --rs-r-md: 10px; --rs-r-lg: 12px;
  --rs-r-xl: 16px; --rs-r-2xl: 24px; --rs-r-3xl: 32px; --rs-r-nav: 44px; --rs-r-pill: 200px;

  /* shadows */
  --rs-shadow-float:  0 12px 40px #00000073;
  --rs-shadow-card:   inset 0 0 0 1px var(--rs-line-8);
  --rs-shadow-row:    inset 0 0 0 1px var(--rs-line-10);
  --rs-shadow-row-hover: inset 0 0 0 1px var(--rs-line-26);
  --rs-shadow-input:  inset 0 0 0 1px #ffffff0f;
  --rs-shadow-input-focus: inset 0 0 0 1px var(--rs-line-30);
  --rs-shadow-glass:  inset 0 .5px #ffffff59;
  --rs-shadow-glass-hover: inset 0 .5px #ffffff;
  --rs-shadow-pink:   0 10px 22px var(--rs-pink-glow);
  --rs-shadow-chrome: 0 0 0 .5px #334047, 0 5px 10px #0c101433, 0 -6px 12px -6px var(--rs-ice-wash);

  /* motion */
  --rs-ease:       cubic-bezier(.22, 1, .36, 1);   /* house */
  --rs-ease-spring:cubic-bezier(.34, 1.2, .64, 1);
  --rs-ease-io:    cubic-bezier(.7, 0, .3, 1);
  --rs-dur-press: 120ms; --rs-dur-fast: 160ms; --rs-dur-base: 300ms;
  --rs-dur-slow: 450ms;  --rs-dur-bg: 900ms;

  /* layout */
  --rs-container: 1200px; --rs-container-narrow: 864px; --rs-container-faq: 800px;
  --rs-section-y: 120px;  --rs-head-gap: 84px;

  /* fonts (wired in layout.tsx via next/font; see Recommendations D) */
  --rs-font-sans:  var(--font-satoshi), system-ui, -apple-system, sans-serif;
  --rs-font-serif: var(--font-serif-accent), Georgia, serif;
  --rs-font-num:   var(--font-inter), system-ui, sans-serif;
}

html { scrollbar-gutter: stable; }
body { background: var(--rs-ink-body); color: var(--rs-text); font-family: var(--rs-font-sans);
       -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; margin: 0; }
h1, h2, h3 { text-wrap: balance; }
p, li { text-wrap: pretty; }
:focus-visible { outline: 2px solid #ffffffcc; outline-offset: 3px; border-radius: 4px; }
.num { font-family: var(--rs-font-num); font-variant-numeric: tabular-nums slashed-zero; }
.serif-accent { font-family: var(--rs-font-serif); font-style: italic; font-weight: 400; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

### D. Tailwind v4 `@theme` mapping (paste under `@import "tailwindcss";`)

```css
@import "tailwindcss";

@theme {
  /* colours -> bg-ink, text-pink, border-line, ring-ice ... */
  --color-ink: #000000;
  --color-ink-body: #010101;
  --color-ink-card: #030611;
  --color-ink-glass: #121214;
  --color-pink: #FE3D70;
  --color-pink-hover: #FF5280;
  --color-pink-deep: #F7225B;
  --color-ice: #B3F4FF;
  --color-ok: #5BE3A0;
  --color-warn: #FFC857;
  --color-danger: #FF5A4E;
  --color-fg: #ffffff;
  --color-fg-80: #ffffffcc;
  --color-fg-65: #ffffffa6;
  --color-fg-50: #ffffff80;
  --color-fg-40: #ffffff66;
  --color-fill-5: #ffffff0d;
  --color-fill-10: #ffffff1a;
  --color-fill-20: #ffffff33;
  --color-line: #ffffff14;
  --color-line-strong: #ffffff42;

  /* fonts */
  --font-sans:  var(--font-satoshi), system-ui, -apple-system, sans-serif;
  --font-serif: var(--font-serif-accent), Georgia, serif;
  --font-num:   var(--font-inter), system-ui, sans-serif;

  /* type scale: size + paired line-height + tracking (-0.02em across display) */
  --text-display: 80px;   --text-display--line-height: 88px;   --text-display--letter-spacing: -0.02em;
  --text-h2: 48px;        --text-h2--line-height: 52.8px;      --text-h2--letter-spacing: -0.02em;
  --text-h3: 32px;        --text-h3--line-height: 35.2px;      --text-h3--letter-spacing: -0.02em;
  --text-title: 24px;     --text-title--line-height: 26.4px;   --text-title--letter-spacing: -0.02em;
  --text-lead: 20px;      --text-lead--line-height: 24px;
  --text-body: 16px;      --text-body--line-height: 28px;
  --text-ui: 14px;        --text-ui--line-height: 16.8px;
  --text-eyebrow: 14px;   --text-eyebrow--line-height: 15.4px; --text-eyebrow--letter-spacing: 0.3em;
  --tracking-tightest: -0.02em;

  /* radii */
  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 10px; --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 24px; --radius-3xl: 32px; --radius-nav: 44px; --radius-pill: 200px;

  /* shadows */
  --shadow-float: 0 12px 40px #00000073;
  --shadow-card: inset 0 0 0 1px #ffffff14;
  --shadow-row: inset 0 0 0 1px #ffffff1a;
  --shadow-row-hover: inset 0 0 0 1px #ffffff42;
  --shadow-input: inset 0 0 0 1px #ffffff0f;
  --shadow-input-focus: inset 0 0 0 1px #ffffff4d;
  --shadow-glass: inset 0 .5px #ffffff59;
  --shadow-pink: 0 10px 22px #ff3c714d;
  --shadow-chrome: 0 0 0 .5px #334047, 0 5px 10px #0c101433, 0 -6px 12px -6px #b3f4ff26;

  /* motion */
  --ease-out-expo: cubic-bezier(.22, 1, .36, 1);
  --ease-spring: cubic-bezier(.34, 1.2, .64, 1);
  --ease-in-out-expo: cubic-bezier(.7, 0, .3, 1);
  --animate-marquee: marquee var(--dur, 60s) linear infinite;
  --animate-banner: banner 8.1s ease-in-out infinite;
  --animate-toast-in: toast-in 250ms var(--ease-out-expo) both;
  --animate-pop-in: pop-in 250ms var(--ease-out-expo) both;

  /* breakpoints: source uses max-width 809.98 / 1199.98 -> min 810 / 1200 */
  --breakpoint-md: 810px;
  --breakpoint-xl: 1200px;

  /* container */
  --container-page: 1200px;
  --container-narrow: 864px;

  @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
  @keyframes banner  { 0% { opacity: 0; filter: blur(8px) } 5%, 28% { opacity: 1; filter: blur(0) } 33%, 100% { opacity: 0; filter: blur(8px) } }
  @keyframes toast-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
  @keyframes pop-in  { from { opacity: 0; transform: scale(.96) translateY(4px) } to { opacity: 1; transform: none } }
}

@utility glass { backdrop-filter: blur(22px); background: #1212148c; box-shadow: var(--shadow-float); }
@utility hairline { box-shadow: var(--shadow-card); }
@utility press { transition: transform 160ms var(--ease-out-expo); &:active { transform: scale(.98); } }
```

Utilities you will use constantly: `bg-ink text-fg font-sans`, `rounded-3xl shadow-card`, `rounded-pill h-12 px-5 text-title font-bold`, `text-display font-normal`, `font-num tabular-nums`, `text-pink font-serif italic`, `ease-out-expo duration-300`, `md:` and `xl:` variants.

Font loading (Next.js): `next/font/local` for Satoshi (400/500/700 woff2 self-hosted), `next/font/google` for `Inter` (variable) and the serif stand-in (`Instrument_Serif`, italic 400), assign `variable: '--font-satoshi' | '--font-inter' | '--font-serif-accent'`.

### E. Signature visual techniques — ordered by value-per-cost

Perf budget (14 GB laptop, iGPU): total ≤ 1 `backdrop-filter` blur ≥ 20px visible at once + ≤ 3 small ones; ≤ 1 running canvas (≤ 30 FPS, ≤ 960×540 backing store, DPR cap 1.5); everything else is static CSS/SVG or compositor-only `transform`/`opacity` animation. The original hero canvas alone is ≈ 24.7 MB of pixels at 3146×1966 plus a 18 MB footer canvas; **do not replicate that**. Always gate on `prefers-reduced-motion`, `IntersectionObserver` (pause off-screen) and `document.hidden`.

1. **Void base + hairline surfaces.** `background: var(--rs-ink)`; cards `bg-ink rounded-3xl shadow-card`, rows `shadow-row` → `hover:shadow-row-hover`. Zero cost, gives 80 % of the look. Never use CSS `border` (hairline is an inset shadow so the radius stays crisp).
2. **Pink light-ribbon hero (CSS, no WebGL).** Layer 2–3 absolutely positioned elements inside `.heroBg` (position:absolute; inset:0; overflow:hidden):
   ```css
   .ribbon { position:absolute; inset:-20% -10% auto -10%; height:90%;
     background:
       radial-gradient(60% 45% at 8% 4%, #E18FB4 0%, #CA5995 12%, transparent 55%),
       radial-gradient(70% 60% at 45% 20%, #991D64 0%, #770C46 35%, transparent 70%),
       radial-gradient(90% 70% at 70% 45%, #520828 0%, transparent 70%);
     filter: blur(40px); transform: rotate(-8deg); will-change: transform; }
   ```
   Optional slow drift: `animation: drift 24s var(--ease-in-out-expo) infinite alternate` on `transform: translate3d(...) rotate(...)` only (compositor-only, ≤ 1 %/frame cost). Pre-render the blur into an AVIF/WebP poster (≤ 20 KB, 960×600, like the source's 3.4 KB poster) and use the CSS version only on `(min-width: 810px)` with no `prefers-reduced-motion`.
3. **Black "bowl" legibility overlay.** `.bowl { position:absolute; inset:0; background: radial-gradient(120% 70% at 50% 100%, #000 0 55%, #0000 100%); mask-image: linear-gradient(#0000 0, #000 220px); }` plus `.heroFade { height:93px; background: linear-gradient(#0000,#000); }`. Replaces the 1.6 KB alpha AVIF and keeps the headline contrast ≥ 7:1.
4. **Sparse particle dots ("freckles") — canvas-lite.** 30–60 dots, 1–2px, white 20–45 % alpha, drifting 2–8 px/s; one `<canvas>` ≤ 960×540, `requestAnimationFrame` capped to 30 FPS, stop when off-screen, render a single static frame under reduced motion. (Alternative: 40 `radial-gradient` background layers on one div, no JS.)
5. **Glass pill nav + chrome-rim CTA.** Nav: `backdrop-filter: blur(22px); background:#1212148c; border-radius:44px; box-shadow:0 12px 40px #00000073`. CTA: three stacked spans (rim with `mask-composite: exclude`, fill with `blur(10px)` gradient `#5c5c6666→#383838`, shine) exactly as in §5.7; label Geist 17/500. These are the only two persistent blur surfaces; make the CTA non-blurred (`background: linear-gradient(#5c5c5c,#383838)`) on low-end (`@media (prefers-reduced-transparency)` / `(max-width: 809px)`).
6. **Progressive bottom fade (reduced).** Instead of 8 backdrop layers use 3: blur `2px / 8px / 24px` with masks `linear-gradient(#0000 0%,#000 33% 66%,#0000 100%)` shifted by thirds, height 120px, `pointer-events:none`. Or skip blur and use `linear-gradient(#0000, #000 85%)` (zero cost). Never stack more than 4 `backdrop-filter` layers on screen.
7. **Edge-masked infinite ticker.** Pure CSS marquee: duplicate the group (`aria-hidden` on the copy), `translateX(-50%)` `linear infinite`, `mask-image: linear-gradient(90deg,#0000,#000 12% 88%,#0000)`, `animation-play-state: paused` until in view, `--dur` computed as `trackWidth / 60px/s`, `will-change: transform` only while running. Use for a live PT/YT ticker (market · implied APY · days to maturity).
8. **Pink / ice hover bloom.** Pseudo-element `::before` 408×267 ellipse `background: var(--rs-pink)` (YT) or `var(--rs-ice)` (PT) with `filter: blur(100px); opacity:0; transition: opacity .6s`; on `:hover`/`:focus-within` → `opacity:1`. Only on ≤ 4 simultaneously visible cards (blur 100 px is paint-heavy); use `radial-gradient(closest-side, color, transparent)` (no filter) for lists/tables.
9. **Serif-italic accent + word reveal.** `<span class="serif-accent text-pink">yield</span>` inside the headline; reveal each word with `opacity 0→1, blur 8px→0, translateY(.4em)→0`, 600–700 ms, stagger 40–60 ms, `--ease-out-expo` (values assumed; source shows only the resting state). Run once on first intersection; `prefers-reduced-motion` → render final state immediately. Animate with Motion/GSAP on `transform`+`opacity` only (blur optional on desktop).
10. **Grid-rows accordion & press feedback.** `display:grid; grid-template-rows:0fr → 1fr; transition: grid-template-rows .35s var(--ease-out-expo)` for expandable portfolio rows and FAQ; every pressable gets `active:scale-[.98]` with `160ms` ease-out-expo; icon buttons `.94`. Cheap, accessible (`aria-expanded`, `aria-controls`, `role=region`).

---

## Implications per role

**Frontend (Next.js/React + Tailwind v4)**
- Use this file as the sole style contract: paste the `:root` block + `@theme` block, load Satoshi (self-hosted), Inter (variable) and a serif-italic via `next/font`; set `className` variables on `<html>`.
- Build primitives in this order: `Button` (white / glass / chrome), `Card` (r32 hairline), `Pill`, `Input`, `Row` (hairline), `Accordion` (grid-rows), `Marquee`, `GlassNav`, `Modal` (mobileMenu recipe), `Toast`. Skip building anything that only existed for marketing (bento, social burst) unless the landing needs it.
- Hero background = pure CSS (technique 2–4); no WebGL dependency in `package.json`. If a canvas is used it must be dynamic-imported, `ssr:false`, client-only, paused off-screen, and capped to 30 FPS.
- Respect the breakpoints (810 / 1200) and the 120 / 84 / 24 spacing rhythm; headline sizes drop to 24/26.4 on mobile.
- Accessibility to keep: global `:focus-visible` ring, `aria-expanded`/`aria-controls` accordions, text contrast: `#ffffff80` (50 %) on black is ≈ 5.3:1 (passes AA for body); `#ffffff66` (40 %) is ≈ 3.7:1 — use only for non-essential captions, not for numbers or labels.
- Numbers: Inter tabular for every figure (balances, APY, countdown) so columns don't jitter.

**Designer / art direction**
- PT = ice, YT = pink is a *new* rule introduced by this file (not from the source); confirm it, and decide whether to commission Editor's Note or accept the stand-in serif.
- Provide a static hero poster (WebP 960×600 ≈ 4 KB) from the CSS ribbon to use as LCP image/fallback.

**Motion / creative dev**
- Use the house easing and the durations list in §8 as the only tokens; the three source JS behaviours worth re-implementing are word reveal, marquee visibility gating and progress bar (`scaleX`, `transform-origin:0`). Use `awwwards-motion`/`work:motion-react` guidance for stagger, but cap parallel running animations on screen at ≤ 3.

**Smart-contract / backend / PM**
- No dependency. Copy constraints that touch them: finance UI must show *time to maturity* as a pill + bar, PT/YT colour convention must be consistent in any exported chart/image; avoid red/pink ambiguity (danger is `#FF5A4E`, brand pink is only for brand/YT).

**QA**
- Verify under `prefers-reduced-motion: reduce` (all `animation:none`, banner frame 1, no transitions) and at 809 / 810 and 1199 / 1200 px; check keyboard focus on every pill/button and the accordion.

---

## Assumptions and open questions

1. **Single page only.** The snapshot is the marketing home; no app UI (tables, modals, toasts, selects) exists. All Rhea screen mappings in Recommendations B are extrapolations from marketing components, not evidenced patterns.
2. **JS stripped.** SingleFile removed script contents (all `<script>` empty except 4 JSON-LD). Library identity beyond Lenis (`html.lenis`) and Unicorn Studio (aria-labels, badge) is unknown; Framer Motion/GSAP are guesses. Word-reveal initial state, stagger, duration, and the FAQ open state are not recoverable; the 600–700 ms / 40–60 ms / blur 8px values in technique 9 are mine (blur 8px is borrowed from `hv-banner`).
3. **Shader code is not recoverable.** WebGL canvases were captured transparent; only the poster WebPs reveal the look. The CSS ribbon gradients in technique 2 are an approximation fitted by eye to the palette `#340613…#E18FB4`, not extracted data.
4. **Hero showcase image semantics.** Interpreted as a black alpha vignette ("bowl") from measuring pixels (RGB 0,0,0, alpha 0.004–1.0); its exact on-screen effect was derived from CSS (116 % width, mask 220px), not observed in a screenshot.
5. **Font licences / availability (unverified):** Satoshi is distributed via Fontshare (assumed free for commercial use — verify terms); Editor's Note (Pangram Pangram) is assumed paid/trial → recommend a free stand-in (Instrument Serif italic) and compare metrics; Outfit, Inter, Geist are open-source. Fallback metrics for the stand-in must be regenerated.
6. **`#E74C6F` vs `#FE3D70`:** two different pinks exist (global focus ring `#E74C6F` in the Tailwind layer vs brand `#FE3D70` on the page, `#FF3D71` in rgba washes, `#F7225B` in icons). I treat `#FE3D70` as canonical and the others as tints; confirm.
7. **Status colours, scrim, PT ice `#B3F4FF`, `--rs-text-40` usage, toast timings, wallet-modal scrim** are new (not in source) and flagged `[new]`.
8. **Contrast ratios** (5.3:1 / 3.7:1) are computed by me for `rgba(255,255,255,a)` on `#000` and not independently tool-verified.
9. **Orphan Gradient-Lab classes** (`gl-*`, `dialkit-*`, `shimmer`, `bg-ticker-scroll`, `bg-page-mount`) exist in S3 but not on the page; I reuse only their keyframe shapes as hints.
10. **Open questions for the PM/designer:** (a) keep a dark-only app? (source has no light theme); (b) is a pink-for-YT / ice-for-PT split acceptable vs Rhea Finance's existing brand colours (not checked in this task); (c) do we ship the chrome CTA at all on a transaction-heavy app?; (d) license for imagery — none of the source's 199 AVIFs/AI backgrounds may be reused without a purchase (FAQ: commercial use allowed only with the paid pack; no resale).

---

## Sources

- Primary: `/home/cn/Projects/Competition/Web3/NEAR/Rhea/docs/Backgrounds Supply ｜ Jaw-Dropping Backgrounds for Your Projects (11_5_2026 5：13：12 PM).html` — SingleFile snapshot of https://backgrounds.supply/?utm_source=designeer.xyz, saved 2026-11-05 17:13:12 GMT+0700. Copy used for analysis: `…/scratchpad/ref.html`. Locators: `S1`–`S8` (n-th `<style>`), `B` (body), `M` (meta), `Img` (embedded data URIs) as defined at the top.
- Scratchpad extractions (not committed): `/tmp/claude-1000/-home-cn-Projects-Competition-Web3-NEAR-Rhea/bdb8c193-199a-4069-8f1d-7cc568832157/scratchpad/ds/{stripped.html, pretty.html, app1.css, css_tw.css, css_fonts.css, css_satoshi.css, body2.txt, outline.txt, assets/*}`.
- Product context: `/home/cn/Projects/Competition/Web3/NEAR/Rhea/docs/Rhea_Strip_MVP_PRD.md` (PT/YT flow, MVP screens).
- Page self-description (head meta, 2026-11-05 snapshot): title "Backgrounds Supply | Jaw-Dropping Backgrounds for Your Projects"; OG image `https://backgrounds.supply/home/og-2026-11.jpg` (1200×630); JSON-LD Organization/WebSite/Product/FAQPage; "Created by Kailash" (footer). Third-party tech credited in DOM: Unicorn Studio (`unicorn.studio` badge), Lenis (`html.lenis`), Next.js, Tailwind v4 (`@property --tw-*`).
- Tools: python3 (`-I`) regex extraction, ImageMagick (`magick`) for palette quantisation of posters and alpha analysis. No network access, no repo writes other than this file.
