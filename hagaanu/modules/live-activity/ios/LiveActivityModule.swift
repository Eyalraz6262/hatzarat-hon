import ActivityKit
import ExpoModulesCore

/**
 The bridge between the alarm and the iOS lock screen.

 A Live Activity is the only way to keep a live, updating card on the lock
 screen and in the Dynamic Island — which is precisely where this app's user is
 looking. They locked their phone and put it in a pocket on the strength of a
 promise, and a card that keeps counting down is the app continuing to make
 that promise where they can see it.

 Everything here is best-effort, and that is the design rather than a shortcut:

   The alarm never depends on it. Detection is the geofence, the background
   stream and the watchdog; this is a display. Every failure path below returns
   quietly instead of throwing, because a lock screen that fails to draw must
   never become the reason a passenger misses their stop.

   The user can switch Live Activities off in Settings, and older phones do not
   have them at all. `areActivitiesEnabled` covers both, and the JS side treats
   an unavailable activity exactly like a disabled one.

 The 12-hour system limit on lock-screen Live Activities is not a problem here:
 a journey longer than that is not a journey this app is for.
 */
public class LiveActivityModule: Module {
  /// The one activity we ever run. There is one journey at a time, so there is
  /// one card at a time.
  private var activity: Any?

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    /// True only when the OS supports Live Activities AND the user has left
    /// them enabled for this app. JS asks once per arm rather than caching:
    /// the setting can change between trips.
    Function("isAvailable") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") {
      (destination: String, distance: String, stops: String, staleText: String) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      // Starting a second activity for the same journey would leave the first
      // one stranded on the lock screen with a distance that never changes.
      await Self.endCurrent(self)

      let attributes = HagaanuActivityAttributes(destination: destination)
      let state = HagaanuActivityAttributes.ContentState(
        distance: distance,
        stops: stops,
        stale: false,
        staleText: staleText
      )

      do {
        // `pushType: nil` — updates come from our own background task, which is
        // already running for the alarm. A push token would mean a server, and
        // this app deliberately has none.
        self.activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
      } catch {
        // Throttled by the OS, or disabled a moment ago. Not our problem to
        // solve, and not the alarm's problem either.
        self.activity = nil
      }
    }

    AsyncFunction("update") {
      (distance: String, stops: String, stale: Bool, staleText: String) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = self.activity as? Activity<HagaanuActivityAttributes> else { return }

      let state = HagaanuActivityAttributes.ContentState(
        distance: distance,
        stops: stops,
        stale: stale,
        staleText: staleText
      )

      /**
       `staleDate` is the promise we make to the OS about how long this number
       is good for. Setting it means that if our process is killed and the
       update stops coming, iOS greys the card out by itself rather than
       leaving a confident, wrong distance on the lock screen.

       Six minutes: the slowest polling tier samples every two, so three missed
       samples is a real outage rather than one skipped fix.
       */
      await activity.update(
        ActivityContent(state: state, staleDate: Date().addingTimeInterval(6 * 60))
      )
    }

    AsyncFunction("end") { (distance: String, stops: String) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = self.activity as? Activity<HagaanuActivityAttributes> else { return }

      let final = HagaanuActivityAttributes.ContentState(
        distance: distance,
        stops: stops,
        stale: false,
        staleText: ""
      )

      // `.immediate`: the trip is over. A card that lingers after the alarm has
      // rung is clutter on a lock screen the user is already looking at.
      await activity.end(
        ActivityContent(state: final, staleDate: nil),
        dismissalPolicy: .immediate
      )
      self.activity = nil
    }
  }

  /// Ends whatever is running, including an activity left over from a previous
  /// launch — after a crash our `activity` reference is gone but the card is
  /// not, and `Activity.activities` is the only way to find it again.
  @available(iOS 16.2, *)
  private static func endCurrent(_ module: LiveActivityModule) async {
    for running in Activity<HagaanuActivityAttributes>.activities {
      await running.end(nil, dismissalPolicy: .immediate)
    }
    module.activity = nil
  }
}
