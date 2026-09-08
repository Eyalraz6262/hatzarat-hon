/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'HagaanuWidget',
  displayName: 'הגענו?',
  // SwiftUI for the views, WidgetKit for the extension, ActivityKit for the
  // Live Activity itself. Without ActivityKit here the extension compiles and
  // the activity silently never appears.
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    // The app's accent, in both schemes. The lock screen picks its own ground,
    // so only the mark is coloured — the same rule the app follows.
    $accent: { color: '#0EA36F', darkColor: '#22C88A' },
  },
};
