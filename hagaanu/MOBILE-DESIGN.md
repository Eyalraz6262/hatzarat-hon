# MOBILE-DESIGN.md — "הגענו?"

The design source of truth. Read this before any UI decision. A re-run of any
skill in the mobile suite **refreshes** this file and reports what changed; it
does not regenerate it from scratch.

Last refreshed: 2026-09-07 · the "קו" rebuild. The previous system ("כרטיס
נסיעה": square corners, ink and paper, signal orange, IBM Plex Mono) was
rejected outright and replaced. Nothing from it survives except the services
layer, which never had a visual opinion.

---

## App Read

```
APP READ: single-purpose transit wake-up alarm for Israeli commuters, plain and
calm language, leaning Expo prebuild + StyleSheet tokens.
platforms: iOS first-class · Android first-class · web none
posture: unified-brand
offline: N/A once armed — the alarm is a geofence and a local position stream
```

The context of use is the design driver, not taste. Someone using this is
holding the phone **in one hand, half asleep, on a moving vehicle, usually in
poor light**. That single sentence produces the whole system: large targets,
one decision per screen, the primary action always in the bottom third, and
nothing that asks the finger for precision.

Two places the platforms diverge, both deliberate:

| Divergence | iOS | Android | Why |
|---|---|---|---|
| Map provider | Apple Maps (`PROVIDER_DEFAULT`) | Google Maps (`PROVIDER_GOOGLE`) | No key, no billing account, Hebrew labels from the OS on iOS. Android has no built-in alternative. |
| Alarm delivery | `interruptionLevel: 'timeSensitive'` | channel at `AndroidImportance.MAX`, `AndroidAudioUsage.ALARM`, `bypassDnd` | Each OS's strongest sanctioned wake path. See `docs/PLATFORM-LIMITS.md`. |

---

## Nav Read

```
App.tsx — a state machine, not a navigator
├── boot                (splash held until fonts + hydrate resolve)
├── PermissionsScreen   foreground or notifications ungranted, or background
│                       ungranted and not yet skipped this session
├── AlarmScreen         phase === 'ringing'   (wins over everything, zIndex 100)
├── ActiveScreen        phase === 'armed'
└── HomeScreen          otherwise — two states on one screen, see below
```

**Zero tabs, zero stacks, and that is correct.** The nav audit found nothing to
fix. The reasoning, so a future session does not "improve" this into a tab bar:

- There is one destination at a time. A tab bar advertises parallel sections
  that do not exist.
- The states are mutually exclusive and driven by app phase, not by user
  navigation. A navigator would model them as pushes the user could pop, which
  is exactly wrong for `ringing`.
- **HomeScreen holds two states rather than two routes.** Picking a place and
  confirming it are one continuous act; a route transition between them would
  spend the ten-second arming budget the product is built around.
- Saved destinations are a strip over the map, for the same reason.

**Never change silently:** the phase names (`idle` / `armed` / `ringing`) are
persisted and read by the background task handlers in a fresh JS context.
Renaming one is a migration, not a refactor.

Back behavior: `useBackGuard` consumes Android back **on the alarm screen
only** — a reflex press was backgrounding the app mid-alarm. Everywhere else
back is the platform default.

---

## The three dials

```
DESIGN_EXPRESSION: 6
MOTION_INTENSITY:  4
VISUAL_DENSITY:    3
```

**EXPRESSION 6 — branded-native.** Custom colour and type tokens, custom
content components, and one genuinely distinctive object (the rail). Deliberately
*not* 8: the previous system sat at 8 and read as costume. There is no
navigation chrome to own here anyway, so the boldness budget goes entirely into
content.

**MOTION 4.** Press feedback on every touchable, state changes animated,
nothing decorative. Two ambient animations exist in the whole app and each
answers a question: the live dot on the status chip ("is this still running
with my screen off?") and the alarm beacon ("did something just happen?").
`useReducedMotion` is honoured throughout.

**DENSITY 3.** One decision per screen, read at arm's length, in a moving
vehicle, in the dark.

### Signature element budget (one bold move per screen)

| Screen | The one bold move | Everything else |
|---|---|---|
| Home (picking) | The map, full bleed | plain search field, plain saved strip |
| Home (route) | **The rail** | quiet map band, plain preset row, plain CTA |
| Active | The stop count, at 52pt | the same rail, quiet fact rows |
| Alarm | The accent floods the entire screen | one target, nothing else |
| Permissions | The stepped board | plain cards, plain copy |

---

## The rail

The app's one distinctive object, and the reason this direction was chosen.

It answers a question a map cannot: not "how far", but **"how many more
stops"**, which is the unit a passenger actually thinks in. "Three stops" tells
you whether to keep reading your book. "4.3 km" does not.

**Ordering.** Everything on the rail is ordered by *distance remaining to the
destination*, descending — `src/components/route/rail.ts`. That single measure
is what makes it work while the vehicle is moving: it needs no route geometry,
no memory of where the trip started and no direction of travel, and it stays
correct when the driver detours or the passenger boarded halfway along. Eight
tests cover the ordering rules.

**The accent runs from the top of the rail down to the passenger and stops
there**, so the coloured length *is* the progress bar. There is no separate
meter, because the rail already is one.

**Stops come from OpenStreetMap via Overpass** — `src/services/transit/`.
Free, no key, no account; Israel's rail stations are complete in OSM. Chosen
over the two alternatives on purpose:

- Google Places would need an API key with billing enabled, and the brief says
  not to introduce one.
- Israel's Ministry of Transport GTFS feed is the better long-term source, but
  it is a ~100MB static archive that needs processing and hosting. That is a
  backend, and this app does not have one.

**Network posture.** The stop list is fetched **once**, when a destination is
chosen, while the user still has signal and attention, and is then **frozen
into the persisted alarm session**. Once armed, the app never touches the
network again: arrival detection is the OS geofence plus the local position
stream, and neither knows the stops service exists. This also means the rail
survives a cold start mid-journey, which is exactly when it matters most.

**Degradation is a designed state, not an error.** No stops found, no network,
or a route too long: the rail still shows you, the wake point and the
destination, and prints one line saying why the names are missing. An app that
quietly shows less than it promised is worse than one that says why.

---

## Design System

### Token file locations

| What | Where |
|---|---|
| Colour, both schemes | `src/theme/colors.ts` |
| Space, shape, type, elevation, motion, touch, icons | `src/theme/index.ts` |
| Google Maps style, derived from the scheme | `src/theme/mapStyle.ts` |
| Primitives | `src/components/ui/index.tsx` |
| The rail: data model / view | `src/components/route/rail.ts` / `RouteRail.tsx` |
| Strings | `src/i18n/translations/{he,en}.ts` |

### Colour

**Light-first with a full dark scheme.** Both defined from day one; `useTheme()`
reads `useColorScheme()`.

| | light | dark |
|---|---|---|
| bg | `#F6F6F3` | `#0F1315` |
| surface | `#FFFFFF` | `#171C1F` |
| ink | `#14171A` | `#ECEFEE` |
| accent fill | `#0EA36F` | `#22C88A` |

**The one rule to preserve if this file is ever edited: the green is a FILL,
and what sits on it is dark ink `#06251A`, never white.** White on a green this
fresh measures 3.24:1 and fails AA. The usual remedy is to darken the green
until white works, which costs the colour its entire character. Dark-on-green
keeps the green and clears AA at 5.04:1 in light and 7.53:1 in dark — and it is
also the less generic choice.

`accent.text` (`#0B7A54` light, `#3FD69B` dark) is a *different value* from
`accent.base`, because the accent as text on the page ground is a different
contrast problem from the accent as a fill. Both are solved, not picked.

Every text value was checked against its own ground before it was written:

| pair | ratio |
|---|---|
| ink on bg | 16.62 : 1 |
| inkMuted on bg / on surface | 5.64 / 6.11 : 1 |
| accent.text on bg / on surface / on soft | 4.94 / 5.35 / 4.79 : 1 |
| accent.on on accent.base | 5.04 : 1 |
| danger on bg | 5.01 : 1 |

`inkFaint` is the escape hatch that keeps this honest: anything too light to be
text is named as such and can never be handed to a `<Text>` by accident.

The **alarm palette is scheme-independent**. It is an event, not a surface: a
person woken at 02:00 gets the same flood they would at 14:00.

### Type

Two families, each with a job. Weight is **always** a face, never `fontWeight`
— Android does not synthesise weights for a named family and silently falls
back to the system font.

- **Heebo** — display, numerals, anything structural.
- **Assistant** — running copy. The permission screens have real paragraphs and
  Heebo is not a reading face at 16px.

Ten roles, all in `type`, and **no component sets `fontSize`**. Dynamic Type is
honoured everywhere; `MAX_CHROME_SCALE = 1.35` bounds it only on chrome the app
draws itself, so a 200% system scale cannot push the primary action off the
bottom. Body copy is deliberately unbounded, and every screen scrolls.

Fonts are imported by **weight subpath** (`@expo-google-fonts/heebo/700Bold/...`).
The package root indexes re-export every weight; importing from them would
bundle 17 `.ttf` to use 5.

### Shape

One radius scale applied by role: `control 12` · `card 18` · `sheet 24` ·
`pill 999`. A pill CTA on one screen and a rounded-rectangle CTA on the next is
the shape drift that makes an interface feel assembled rather than designed, so
those four roles are the whole vocabulary.

### Space

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40`. Screen padding is `space.screen = 20`,
picked once and never varied.

### Elevation

Two levels, and **each one is an iOS shadow AND an Android elevation** —
`elevation(level, scheme)`. A `shadowColor` without a sibling `elevation`
renders as nothing on Android, which is how apps designed on a Mac end up flat
on half their install base.

### Icons

**One family: Lucide** (`lucide-react-native`). Three sizes (16/20/24) and one
stroke (2), set in `theme.icon` so a component cannot introduce a fourth. No
hand-drawn SVG paths, no emoji anywhere in the app.

### Touch

`HIT = 48`, above the 44pt platform floor on purpose: the floor assumes a
steady hand. Small glyphs get `hitSlop` so their target is 48 even when the
mark is 20. The alarm's dismiss target is **88pt tall** — the person pressing
it was asleep four seconds ago.

### Motion

Press: scale to 0.97 (0.98 on large surfaces), 90ms down / 180ms up,
`Easing.out(Easing.quad)`, native driver, gated on `useReducedMotion`. Down is
faster than up because the finger arrives instantly and leaves gradually.
`useNativeDriver: false` appears nowhere.

### Haptics

`tick` (a value changed under your thumb) · `commit` (armed — the last thing
felt before the phone goes in a pocket) · `release` (cancelled or dismissed) ·
`error`. Never on plain taps or navigation.

---

## The SAFE / RISK register

**SAFE choices** — light-first with a full dark scheme, one accent, one grey
ramp per scheme, on-grid spacing, system-honoured Dynamic Type, native alert
dialogs for destructive confirms only, platform-native maps, no custom
navigation chrome because there is no navigation, one icon family.

**RISK 1 — dark ink on the accent instead of white**
- *gain:* keeps a fresh, saturated green that clears AA at 5.04:1, and reads as
  a deliberate choice rather than the default.
- *cost:* it is unusual enough that a future contributor will "fix" it to white
  unless they read `colors.ts`. The reason is written at the top of that file
  and repeated here.

**RISK 2 — the rail depends on a third-party open data source**
- *gain:* the one thing this app offers that a plain geofence alarm does not.
- *cost:* Overpass is a volunteer-run service with no SLA, and OSM bus-stop
  coverage on intercity routes is uneven. Mitigated three ways: two mirrors, a
  9s timeout, and a degraded rail that still tells the truth. Never blocks
  arming, and never runs after arming.

**RISK 3 — two states on one screen instead of two routes**
- *gain:* the ten-second arming budget survives.
- *cost:* `HomeScreen` is the largest file in the UI layer and will keep
  wanting to be split. Splitting it into routes is the one refactor that would
  undo the product's core promise; splitting it into components is fine.

**RISK 4 — the alarm screen abandons the design system entirely**
- *gain:* zero ambiguity about what just happened, to someone opening their
  eyes for the first time in twenty minutes.
- *cost:* it is the one screen whose colours do not come from the active
  scheme, so a theme change will never affect it. That is intended and is why
  `alarm` sits outside the light/dark split in `colors.ts`.

No RISK was rejected; nothing here is a SAFE swap-in.

---

## Standing gaps

- **The alarm sound is synthesised sine waves** (`assets/sounds/alarm.wav`,
  generated with Python). Functionally correct — routed to the alarm stream,
  bypassing DND — but it is the largest remaining quality gap in an app whose
  entire job is a sound that wakes someone. It needs a real recording.
- **Not verified on device.** The environment has no Android SDK and no
  reachable build service, so the live checks are unverified: keyboard
  behaviour, splash-to-first-frame, scroll performance, 1.3× font scale,
  edge-to-edge insets, and actual geofence delivery latency.
- **The Overpass call itself is unverified.** The environment's network policy
  blocks `overpass-api.de`, so the query was written against the documented API
  and the degradation path, not against a live response. Worth confirming on
  the first real device run.
- **`GOOGLE_MAPS_API_KEY`** is the only external credential and is required for
  Android only. See `README.md`.

---

## Baseline

`design-baseline.json` at the project root is the regression record. It is
refreshed in place, never forked.
