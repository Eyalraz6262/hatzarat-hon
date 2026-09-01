# MOBILE-DESIGN.md — "הגענו?"

The design source of truth. Read this before any UI decision. A re-run of any
skill in the mobile suite **refreshes** this file and reports what changed; it
does not regenerate it from scratch.

Last refreshed: 2026-09-01 · after the whole-app rebuild (`mobile-redesign-app`,
preserve-language mode).

---

## App Read

```
APP READ: single-purpose transit alarm for Israeli public-transport passengers,
Israeli-rail-signage language ("כרטיס נסיעה"), leaning Expo prebuild + plain
StyleSheet tokens.
platforms: iOS first-class · Android first-class · web none
posture: unified-brand
```

The app has one job: wake someone who fell asleep on the bus or train before
their stop. Everything else — accounts, payments, social, AI — is explicitly out
of scope by the brief and stays out.

`unified-brand` is a commitment, not a shrug: one look on both platforms, with
native chrome underneath it. The two places the platforms are allowed to diverge
are documented and deliberate:

| Divergence | iOS | Android | Why |
|---|---|---|---|
| Map provider | Apple Maps (`PROVIDER_DEFAULT`) | Google Maps (`PROVIDER_GOOGLE`) | No key, no billing account, Hebrew labels from the OS on iOS. Android has no built-in alternative. |
| Alarm delivery | `interruptionLevel: 'timeSensitive'` | notification channel at `AndroidImportance.MAX`, `AndroidAudioUsage.ALARM`, `bypassDnd` | Each OS's own strongest sanctioned wake path. See `docs/PLATFORM-LIMITS.md`. |
| Naming a saved stop | `Alert.prompt` | falls back to the destination's own label | Android has no `Alert.prompt` and a modal text sheet would cost the ten-second budget. |

---

## Nav Read

```
App.tsx  — a state machine, not a navigator
├── boot            (splash held until fonts + hydrate resolve)
├── PermissionsScreen   when foreground location is not yet granted,
│                       or background is ungranted and not yet skipped
├── AlarmScreen         phase === 'ringing'   (wins over everything)
├── PassScreen          phase === 'armed'
└── HomeScreen          otherwise — map + ticket stub
```

**Zero tabs, zero stacks, and that is correct.** The nav audit
(`_shared/references/navigation.md` mechanical checks) found nothing to fix, so
Phase 6 of the redesign was skipped by the skill's own rule ("if navigation is
fine, say so and skip the phase; most redesigns should").

The reasoning, so a future session does not "improve" it into a tab bar:

- There is one destination at a time. A tab bar advertises parallel sections
  that do not exist here.
- The states are mutually exclusive and driven by app phase, not by user
  navigation. A navigator would model them as pushes the user could pop, which
  is exactly wrong for `ringing`.
- Saved destinations are a **strip**, not a screen, for the same reason: the
  product's promise is armed-in-ten-seconds, and a route transition spends that
  budget for nothing.

**Never change silently:** the phase names (`idle` / `armed` / `ringing`) are
persisted in storage and read by the background task handlers in a fresh JS
context. Renaming one is a migration, not a refactor.

Back behavior: `useBackGuard` consumes Android back **on the alarm screen only**
(a reflex press was backgrounding the app mid-alarm — FINDING-001). Everywhere
else back is the platform default.

---

## The three dials

```
DESIGN_EXPRESSION: 8
MOTION_INTENSITY:  2
VISUAL_DENSITY:    3
```

**EXPRESSION 8** — above the 4–7 "branded-native" band, and the cost is paid
knowingly. Custom brand faces everywhere, a custom bottom stub instead of a
sheet library, drawn SVG marks instead of an icon font, a fully custom map
style. Per `mobile-taste` 1.C (CHROME LAGS CONTENT), 8 is the level at which
owning the chrome is permitted — and this app *has* no navigation chrome to
own, which is what makes 8 affordable here. Safe areas, press states and
accessibility roles are therefore ours: every one is set explicitly.

**MOTION 2** — deliberately below the 3 threshold at which reduced-motion
becomes mandatory, and `useReducedMotion` is honored anyway. The user is asleep
or about to be. The only sustained animation in the app is the 5.2s watermark
drift on the wake pass, and it is slow enough to read as "running" rather than
as something asking for attention. Everything else is a 90ms-down / 170ms-up
press scale on the UI thread.

**DENSITY 3** — one decision per screen, at arm's length, in a moving vehicle,
in the dark. The hero on the wake pass is 52pt for a reason.

### Signature element budget (one bold move per screen)

| Screen | The one bold move | Everything else |
|---|---|---|
| Home | The alert zone drawn as a survey diagram — dashed ring, twelve azimuth ticks, a dimension line calling the radius | quiet ticket stub, plain chips |
| Pass | The 52pt promise over a printed timetable | quiet board rows, quiet foot |
| Alarm | The full-bleed signal flood | one dismiss target, nothing else |
| Permissions | The stepped board | plain cards, plain copy |

---

## Design System

### The three rules

Everything below serves one of these. They are enforced structurally where
possible, not just written down.

1. **Square corners only.** There is deliberately **no `radii` token** — a
   component cannot reach for one. The only round things are station nodes and
   perforation punches, which are circles by nature and take an explicit
   `borderRadius` equal to half their size at the point of use.
2. **One orange per screen.** It is the primary action, *or* the status mark,
   *or* (on the alarm) the entire surface. Never two.
3. **No emoji.** Every mark is drawn SVG in `src/components/icons`.

### Token file locations

| What | Where |
|---|---|
| Raw pigments | `src/theme/palette.ts` — **components never import this** |
| Semantic schemes (night + day) | `src/theme/schemes.ts` |
| Scheme hook | `src/theme/useTheme.ts` — `useTheme()`, `useSurface('world' \| 'ticket')` |
| Spacing, type scale, faces, a11y constants | `src/theme/index.ts` |
| Google Maps style, derived from the scheme | `src/theme/mapStyle.ts` — `mapStyleFor(scheme)` |
| Primitives | `src/components/ui/index.tsx` |
| Marks | `src/components/icons/index.tsx` |
| Strings | `src/i18n/translations/{he,en}.ts` |

The palette → schemes indirection is the load-bearing part. The earlier system
named its tokens after the *material* (`ink`, `paper`, `rail`), which meant every
component hard-coded a material and no second scheme was possible at all.

### The two-surface architecture

Unusual, and specific to this design: **two materials are on screen at once** —
the ink world of the map, and the paper of the ticket docked over it. A single
flat `textPrimary` would be wrong on one of them. So each scheme carries two
`Surface` sets and a component asks for the surface it is drawn on:

- `world` — the map, its chrome, the permission board
- `ticket` — every paper surface: the stub, the wake pass, the saved stubs

```ts
type Surface = {
  bg; raised;
  textPrimary; textSecondary; textMuted;
  border;   // control outlines — a drawn line, not a hairline
  divider;  // hairline rules between rows
  faint;    // perforations, dotted leaders, watermarks — NON-TEXT, unconstrained
  pressed;
};
```

`faint` is the escape hatch that keeps the contrast rules honest: anything too
light to be text is named as such and can never be handed to a `<Text>` by
accident.

### The two schemes

**Day is not an inversion.** It is the same two objects under different light: a
paper ticket lying on a warmer, heavier counter stock, separated by value and by
the perforation rather than by a jump to a dark ground.

| | `night` — the unlit carriage, 23:00 | `day` — the lit platform, 07:00 |
|---|---|---|
| world bg | `#14161C` ink | `#DED7C9` counter |
| ticket bg | `#F2EDE4` paper | `#FBF8F1` bright paper |
| statusBar | light | dark |

`alarm` is **scheme-independent** in both — it is an event, not a surface. A
person woken at 02:00 gets the same flood they would at 14:00.

### Color: the accent, and the contrast solve

One accent, `signal #FF6B1A`, one grey family per material, no gradients, no
indigo, saturation under 80%.

Four values in the shipped palette failed WCAG AA and were solved rather than
re-picked — hue and saturation held, lightness moved until the ratio cleared
4.5:1, so each fix is *the same colour at a different lightness*:

| Token | Was | Measured | Now |
|---|---|---|---|
| `paperMuted` | `#A79E8E` | 2.27:1 | `#746B5B` |
| `signalOnPaper` | `#FF6B1A` | 2.44:1 | `#BE4300` |
| `rail` | `#6B7280` | 3.74:1 | `#78808E` |
| `paperSub` | `#8C8478` | 4.15:1 | `#666C7A` |

`signalOnPaper` exists because the rule is about **text**: fills, rules and
shapes keep `signal`. The old values survive as `paperFaint` / `railFaint` for
non-text use, which is why those names exist.

### Type

Two Hebrew families and one Latin mono. Weight is **always** a face, never
`fontWeight` — Android does not synthesise weights for a named family and would
silently fall back to the system font.

| Role | Face |
|---|---|
| Headline voice | Heebo 900 Black / 800 ExtraBold |
| Running Hebrew | Assistant 600 SemiBold / 700 Bold |
| Numerals + Latin codes | IBM Plex Mono 400 / 500 |

**IBM Plex Mono has no Hebrew coverage.** Hebrew set in it falls back without
warning while keeping the Latin letter-spacing, which is how eight sites of it
shipped unnoticed. The primitives now make the mistake structurally impossible:

- `<Label>` — Hebrew, Assistant, zero tracking
- `<Plate>` — Latin/digits, mono, wide tracking

They are separate components; you cannot pass Hebrew to the mono path without
deliberately reaching past both.

**Ten sizes, all of them in `type`. No component sets `fontSize` inline.** An
earlier pass had twenty distinct sizes once one-off overrides were counted,
which is not a scale, it is a pile. Dynamic Type is honored, with
`MAX_DISPLAY_SCALE = 1.3` capping only the display faces so a 200% system scale
cannot push the distance readout off-screen; body copy scales unbounded and
every screen scrolls.

Fonts are imported by **weight subpath**
(`@expo-google-fonts/heebo/900Black/Heebo_900Black.ttf`). The package root
indexes re-export every weight — importing from them bundled 30 `.ttf` to use 6
(assets 4.0MB → 1.7MB).

### Spacing

`4 · 8 · 12 · 16 · 24 · 32`, on the grid, no off-scale values.

### Touch targets

`HIT_SIZE = 48` (above the 44pt floor, which survives every density level).
Checked rather than assumed, because signage-style square controls make it easy
to draw something that looks tappable and is 32px tall.

### Elevation

There is none. No `shadowColor`, no `elevation`. Separation comes from the
perforation, the border, and the value difference between the two materials —
which is what a paper ticket lying on a counter actually does.

### Haptics vocabulary

| | When |
|---|---|
| `tick` | a value changed under your thumb (radius, a chip, picking a saved stub) |
| `commit` | the alarm is armed — the last thing felt before the phone goes in a pocket |
| `release` | the alarm was cancelled or dismissed |
| `error` | the action failed |

### Motion

- Press: scale to 0.97 (0.98 on large surfaces), 90ms down / 170ms up,
  `Easing.out(Easing.quad)`, native driver, gated on `useReducedMotion`.
- The watermark drift on the wake pass: 5.2s each way, native driver.
- Nothing else animates. `useNativeDriver: false` appears nowhere.

---

## The SAFE / RISK register

The approved proposal, kept so a future session knows which departures were
chosen on purpose.

**SAFE choices** — square-on-grid spacing, one accent, one grey family per
material, both schemes from day one, system-honored Dynamic Type, native alert
dialogs for destructive confirms, platform-native maps, no custom navigation
chrome because there is no navigation.

**RISK 1 — square corners everywhere, no radius token at all**
- *gain:* the single decision that stopped the screens reading as a generic
  rounded-card template; it is also literally what rail signage does.
- *cost:* a square control does not read as tappable from shape alone, so every
  interactive surface has to earn it through border weight, press state and hit
  size. There is no fallback if the language is ever abandoned — this is a
  system-wide commitment, not a component style.

**RISK 2 — two Surface sets per scheme instead of one flat token set**
- *gain:* the map and the ticket can both be correct at once, and `day` becomes
  a real second material rather than an inversion.
- *cost:* every component must know which surface it is drawn on. A component
  that forgets and calls bare `useTheme().ticket` while sitting on the world
  will look almost right, which is the worst kind of wrong. `useSurface()`
  exists to make the choice explicit at the call site.

**RISK 3 — a Hebrew/Latin split at the component level, not the style level**
- *gain:* makes the IBM-Plex-has-no-Hebrew failure unrepresentable.
- *cost:* two components where most systems have one, and a reviewer who does
  not know why will "simplify" them back together.

**RISK 4 — the alert zone drawn from polylines rather than a map `Circle`**
- *gain:* a dashed survey ring with azimuth ticks and a dimension line, in the
  map's own coordinate space, geographically true at every zoom.
- *cost:* it is recomputed geometry rather than a native overlay, and it is
  memoised on `[destination, radiusM]` precisely so a pan does not rebuild it.
  Neither platform can dash a `Circle`, which is why the safe version was not
  available in the first place.

No RISK was rejected; nothing here is a SAFE swap-in.

---

## Standing gaps

- **The alarm sound is synthesised sine waves** (`assets/sounds/alarm.wav`,
  generated with Python). It is functionally correct — routed to the alarm
  stream, bypassing DND — but it is the single largest quality gap in an app
  whose entire job is a sound that wakes someone. It needs a real recording.
- **Not verified on device.** The environment has no Android SDK and no reachable
  Expo build service, so the live checks (splash, keyboard, scroll perf at 1.3×
  font scale, edge-to-edge, actual geofence delivery latency) are unverified.
  See `docs/PLATFORM-LIMITS.md` for what the OS does and does not promise.
- **`GOOGLE_MAPS_API_KEY`** is the only external credential in the project and is
  required for Android only. See `README.md`.

---

## Baseline

`design-baseline.json` at the project root is the regression record — categories,
findings, and their status. It is refreshed in place, never forked.
