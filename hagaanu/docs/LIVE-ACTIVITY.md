# Live Activity (iOS lock screen)

The card that keeps counting down on the lock screen and in the Dynamic Island
while the alarm is armed.

## Status: written, not compiled

**This is the one part of the project that has not been built.** The Swift in
`targets/widget/` and `modules/live-activity/ios/` has never been through a
compiler — this repository was developed in a Linux container with no macOS, no
Xcode and no access to `api.expo.dev`. Everything else in the app has been
typechecked, unit-tested and bundled for both platforms; this has not.

Treat the Swift as a first draft that needs a build before it is believed.

## Why it is behind a flag

`@bacons/apple-targets` adds a Widget Extension target to the Xcode project.
That is the most fragile thing in the config: a mistake in it fails
`npx expo prebuild` for the **whole app**, not just the widget.

The alarm does not depend on the card — detection is the OS geofence, the
background location stream and the watchdog, and the card only displays what
they are already doing. So the default build does not carry that risk:

```sh
npx expo prebuild            # no widget target, no risk
```

Turn it on deliberately, on a Mac:

```sh
export APPLE_TEAM_ID=XXXXXXXXXX          # Xcode → Signing & Capabilities
export HAGAANU_LIVE_ACTIVITY=1
npx expo prebuild -p ios --clean
npx expo run:ios --device
```

With the flag off, `NSSupportsLiveActivities` is `false`, the plugin is not in
the plugin list, and `requireOptionalNativeModule` finds nothing — so every
call in `modules/live-activity/index.ts` does nothing at all. That is a
supported state, not a degraded one.

## The pieces

| File | What it is |
| --- | --- |
| `modules/live-activity/index.ts` | The TS facade. Every method swallows its own failure. |
| `modules/live-activity/ios/LiveActivityModule.swift` | The ActivityKit bridge: request, update, end. |
| `modules/live-activity/ios/HagaanuActivityAttributes.swift` | The data shape, app side. |
| `targets/widget/HagaanuActivityAttributes.swift` | **The same struct**, extension side. |
| `targets/widget/index.swift` | The SwiftUI card and Dynamic Island. |
| `targets/widget/expo-target.config.js` | Target name, frameworks, accent colour. |
| `src/services/notifications/liveCard.ts` | Builds the strings the card shows. |

The two `HagaanuActivityAttributes.swift` files are deliberate duplicates.
ActivityKit matches the app and the extension by the attributes type, and they
compile into separate binaries, so the declaration has to exist in both. **They
must stay identical.** Change one, change the other.

## Why the card takes strings, not numbers

Every field crossing the bridge is a string that JavaScript has already
formatted and translated.

The app ships in four languages, two of them right-to-left, with distance
rounding that already exists in `formatDistance`. Re-implementing any of it in
Swift would produce a lock screen that slowly drifts from the app it belongs
to, and no test would catch the drift. SwiftUI renders what it is handed and
gets the user's chosen language for free.

## Lifecycle

| Moment | Call |
| --- | --- |
| Alarm armed | `start(destination, distance, stops, staleText)` |
| Background fix, when the rendered distance changes | `update(...)` |
| No fix for 90s | `update(..., stale: true, ...)` |
| Alarm rings | `end()` — the alarm has the screen now |
| Leg advances to a transfer's next target | `end()` then `start()` — attributes are fixed for an activity's life |
| Cancel / "I'm awake" | `end()` |

Updates are sent on the same rule as the ongoing notification: only when the
rendered text actually changed. ActivityKit budgets updates, and spending one
to redraw an identical string wastes it.

`staleDate` is set six minutes ahead on every update. If our process is killed
and updates stop, iOS greys the card out by itself rather than leaving a
confident, wrong distance on the lock screen. Six minutes because the slowest
polling tier samples every two, so three missed samples is a real outage rather
than one skipped fix.

## Android

Android has no Live Activity, and nothing here pretends otherwise.

What it has instead is already built and working: an ongoing, low-importance
notification on its own silent channel, carrying the destination and a distance
that updates on exactly the same rule. It is a row rather than a card, and on
Android 12+ the system promotes an ongoing notification of this kind to the top
of the lock screen by itself.

A richer Android treatment would need a custom notification layout through a
native module — `expo-notifications` does not expose `setProgress`. That is a
real option and it is not built; the current row is honest and does the job.

## What to check on a device

1. The card appears on the lock screen within a second of arming.
2. The distance changes as the trip progresses, and the number matches the
   in-app one.
3. Losing signal for two minutes replaces the distance with "אין קליטה" rather
   than freezing the last number.
4. The card disappears the moment the alarm rings.
5. Force-quitting the app leaves the card, and iOS greys it out within about
   six minutes rather than leaving it looking live.
6. On a journey with a change: the card ends and a new one starts, naming the
   final destination, when the transfer alarm is dismissed.
7. Switching Live Activities off in iOS Settings → הגענו? leaves the alarm
   working exactly as before.

Number 7 is the one that matters most. Everything above it is a display.
