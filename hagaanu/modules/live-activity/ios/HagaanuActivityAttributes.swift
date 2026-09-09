import ActivityKit
import Foundation

/**
 The shape of the Live Activity.

 ⚠️ This file has a TWIN in `targets/widget/HagaanuActivityAttributes.swift`.
 ActivityKit matches the app and the widget extension by the attributes type,
 and they are compiled into separate binaries, so the declaration must exist in
 both and the two must stay identical. Change one, change the other.

 Every field is a STRING that JavaScript has already formatted and translated.
 That is deliberate: the app ships in four languages, two of them right-to-left,
 and re-implementing the number formatting and the wording in Swift would give
 us a lock screen that drifts from the app it belongs to. SwiftUI renders what
 it is handed, and gets the user's chosen language for free.
 */
struct HagaanuActivityAttributes: ActivityAttributes {
  /// Fixed for the life of the activity. A change of destination ends this
  /// activity and starts another, because the attributes cannot be updated.
  let destination: String

  struct ContentState: Codable, Hashable {
    /// "1.2 ק״מ", already rounded and localised.
    var distance: String
    /// "עוד 3 תחנות", or empty when the stop list is unavailable.
    var stops: String
    /// True while no fix has arrived recently. The lock screen must stop
    /// claiming a live distance rather than show a stale number as current.
    var stale: Bool
    /// What to say instead of the distance when `stale`.
    var staleText: String
  }
}
