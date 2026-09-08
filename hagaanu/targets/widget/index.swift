import ActivityKit
import SwiftUI
import WidgetKit

/**
 The lock screen card.

 This is the app's promise, kept where the user can see it: they locked the
 phone on the strength of "I will wake you", and this keeps counting down in
 front of them without their having to unlock anything to check.

 Three rules carried over from the app's own design:

   The green is a FILL, and what sits on it is dark ink. Never white — white on
   this green is 3.24:1 and fails AA, and darkening the green to fix that costs
   the colour its character.

   The distance is the largest thing on the card, because it is the only number
   the user actually wants. Everything else is a label for it.

   When the fix goes stale the card stops showing a distance at all. Continuing
   to display the last number as though it were current is the app quietly
   lying to someone who is asleep, and that is the one thing this product must
   never do.

 Every string arrives already formatted and translated from JavaScript, so this
 file contains no numbers to round and no words to localise.
 */

private let inkOnAccent = Color(red: 0.024, green: 0.145, blue: 0.102)  // #06251A

struct HagaanuLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: HagaanuActivityAttributes.self) { context in
      LockScreenCard(context: context)
        .activityBackgroundTint(nil)  // the system's own material, not a tint
        .activitySystemActionForegroundColor(.primary)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: "bus.fill")
            .foregroundStyle(Color("$accent"))
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.stale ? context.state.staleText : context.state.distance)
            .font(.system(.title3, design: .rounded).weight(.bold))
            .monospacedDigit()
            .foregroundStyle(context.state.stale ? Color.secondary : Color.primary)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.destination)
              .font(.headline)
              .lineLimit(1)
            if !context.state.stops.isEmpty && !context.state.stale {
              Text(context.state.stops)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      } compactLeading: {
        Image(systemName: "bus.fill")
          .foregroundStyle(Color("$accent"))
      } compactTrailing: {
        // The compact island is a few points wide. The distance alone is the
        // only thing that survives at that size, and it is the right thing.
        Text(context.state.stale ? "—" : context.state.distance)
          .monospacedDigit()
      } minimal: {
        Image(systemName: "bus.fill")
          .foregroundStyle(Color("$accent"))
      }
      .widgetURL(URL(string: "hagaanu://active"))
    }
  }
}

private struct LockScreenCard: View {
  let context: ActivityViewContext<HagaanuActivityAttributes>

  var body: some View {
    HStack(alignment: .center, spacing: 14) {
      // The mark: a filled green disc with dark ink on it, the app's one
      // coloured object.
      ZStack {
        Circle().fill(Color("$accent"))
        Image(systemName: "bus.fill")
          .font(.system(size: 17, weight: .bold))
          .foregroundStyle(inkOnAccent)
      }
      .frame(width: 38, height: 38)

      VStack(alignment: .leading, spacing: 3) {
        Text(context.attributes.destination)
          .font(.system(.subheadline, design: .rounded).weight(.semibold))
          .lineLimit(1)

        if context.state.stale {
          Text(context.state.staleText)
            .font(.footnote)
            .foregroundStyle(.secondary)
        } else if !context.state.stops.isEmpty {
          Text(context.state.stops)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }

      Spacer(minLength: 8)

      if !context.state.stale {
        Text(context.state.distance)
          .font(.system(.title2, design: .rounded).weight(.bold))
          .monospacedDigit()
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 14)
  }
}

/**
 The extension's entry point.

 A Live Activity has no timeline and no home-screen family — it exists only for
 as long as the app keeps it alive. So this bundle declares the activity and
 nothing else; there is no home-screen widget in this product, because there is
 nothing useful to show when no journey is running.
 */
@main
struct HagaanuWidgetBundle: WidgetBundle {
  var body: some Widget {
    HagaanuLiveActivity()
  }
}
