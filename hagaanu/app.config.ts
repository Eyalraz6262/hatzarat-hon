import type { ExpoConfig } from 'expo/config';

/**
 * Expo config for "הגענו?" (Hagaanu).
 *
 * This file is the native project. Everything under ios/ and android/ is
 * generated from it by `npx expo prebuild`, so native capabilities are declared
 * here rather than edited by hand — that keeps the two platforms in sync and
 * upgradable.
 *
 * The Google Maps key is read from the environment so it never lands in git.
 * See README.md → "Google Maps API key".
 */

const GOOGLE_MAPS_ANDROID_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

/**
 * The iOS Live Activity, behind an opt-in flag.
 *
 * `@bacons/apple-targets` adds a Widget Extension target to the Xcode project.
 * That is the single most fragile thing in this config — it needs Xcode 16 and
 * a macOS machine, and a mistake in it fails `expo prebuild` for the WHOLE app,
 * not just the widget. The alarm does not depend on the card, so the default
 * build does not carry that risk.
 *
 * Turn it on when building on a Mac with the widget verified:
 *
 *     HAGAANU_LIVE_ACTIVITY=1 npx expo prebuild -p ios --clean
 *
 * See docs/LIVE-ACTIVITY.md.
 */
const LIVE_ACTIVITY = process.env.HAGAANU_LIVE_ACTIVITY === '1';

const config: ExpoConfig = {
  name: 'הגענו?',
  slug: 'hagaanu',
  scheme: 'hagaanu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  /**
   * The app follows the device, and the theme setting overrides it in JS.
   * Forcing 'dark' here would make the native chrome disagree with a user who
   * chose light — and the splash would then hand over to a screen of the
   * opposite colour.
   */
  userInterfaceStyle: 'automatic',
  // The light ground, which is what App paints before the first frame.
  backgroundColor: '#F7F8FA',

  ios: {
    bundleIdentifier: 'com.hagaanu.app',
    supportsTablet: false,
    /**
     * Required by the widget target, and only by it — a second target has to be
     * signed, and signing needs the team. Read from the environment for the
     * same reason as the Maps key: it identifies the developer account and does
     * not belong in git.
     */
    appleTeamId: process.env.APPLE_TEAM_ID,
    // Hebrew is the shipping language; the OS uses this for RTL and for the
    // language of the permission dialogs.
    infoPlist: {
      CFBundleDevelopmentRegion: 'he',
      CFBundleLocalizations: ['he', 'en'],

      /**
       * Background modes.
       *  - `location` lets Core Location deliver region-entry and location events
       *    while we are suspended. Without it geofencing does nothing in the
       *    background, which is the whole product.
       *  - `audio` lets the alarm keep playing after it starts from a background
       *    wake, instead of being cut off when the app is not frontmost.
       */
      UIBackgroundModes: ['location', 'audio'],

      // Permission copy. iOS shows these verbatim in the system dialog, so they
      // are written in the same voice as the in-app primer.
      NSLocationWhenInUseUsageDescription:
        'כדי להראות לך איפה אתה על המפה ולחשב את המרחק ליעד.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'כדי להעיר אותך לפני התחנה, "הגענו?" צריכה לזהות מתי אתה מתקרב ליעד גם כשהמסך כבוי והאפליקציה סגורה.',
      NSLocationAlwaysUsageDescription:
        'כדי להעיר אותך לפני התחנה, "הגענו?" צריכה לזהות מתי אתה מתקרב ליעד גם כשהמסך כבוי והאפליקציה סגורה.',

      /**
       * Live Activities are refused silently without this key — no error, no
       * card. It lives in the APP's Info.plist, not the extension's.
       */
      NSSupportsLiveActivities: LIVE_ACTIVITY,

      // Keeps the alarm audible when the ringer switch is on silent.
      UIRequiresPersistentWiFi: false,
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      /**
       * Time Sensitive notifications break through Focus modes and scheduled
       * summaries. Unlike Critical Alerts this needs no approval from Apple —
       * it is a capability any developer can enable.
       */
      'com.apple.developer.usernotifications.time-sensitive': true,
    },
  },

  /**
   * The web build is a DEMO, not the product.
   *
   * A browser cannot register an OS geofence, cannot wake a terminated tab,
   * and cannot make a sound with the screen off — which is the entire premise
   * of this app. What the web build is good for is seeing and operating every
   * screen without a Mac, an Android device or a store account, so the design
   * and the flow can be judged before any of that exists.
   */
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },

  android: {
    package: 'com.hagaanu.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      // The brand itself: the adaptive icon's mark is white, so the tile is
      // the colour rather than a dark ground the mark sits on.
      backgroundColor: '#2B4EF0',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      // The one that makes geofencing work with the screen off.
      'ACCESS_BACKGROUND_LOCATION',
      // Android 8+ requires a foreground service for a real background location
      // stream; Android 14 additionally requires the typed permission.
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'POST_NOTIFICATIONS',
      'VIBRATE',
      'WAKE_LOCK',
      // Lets the geofence be re-armed after a reboot (a reboot clears the OS
      // geofence registry).
      'RECEIVE_BOOT_COMPLETED',
    ],
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },

  plugins: [
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'כדי להעיר אותך לפני התחנה, "הגענו?" צריכה לזהות מתי אתה מתקרב ליעד גם כשהמסך כבוי והאפליקציה סגורה.',
        locationWhenInUsePermission: 'כדי להראות לך איפה אתה על המפה ולחשב את המרחק ליעד.',
        // Generates the native background-location boilerplate on both platforms.
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2B4EF0',
        // Copies every tone into res/raw (Android) and the app bundle (iOS) so
        // the notification itself can play the one the user chose — including
        // when our JS process is gone by the time the notification is shown.
        // Keep in sync with src/services/audio/sounds.ts.
        sounds: [
          './assets/sounds/alarm-soft.wav',
          './assets/sounds/alarm-normal.wav',
          './assets/sounds/alarm-sharp.wav',
        ],
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '16.4' },
        android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 26 },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#F7F8FA',
        // A separate mark for the dark ground: one asset cannot be legible on
        // both #F7F8FA and #0E1116, and the splash follows the device.
        dark: {
          image: './assets/splash-icon-dark.png',
          backgroundColor: '#0E1116',
        },
      },
    ],
    [
      'expo-audio',
      {
        // We only ever play audio. Declining the microphone permission keeps the
        // store listing honest and avoids a review question we have no answer to.
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        // Lets the alarm keep playing after a background wake.
        enableBackgroundPlayback: true,
      },
    ],
    'expo-dev-client',
    // Spread rather than a conditional entry, so the array has no holes when
    // the flag is off.
    ...(LIVE_ACTIVITY ? (['@bacons/apple-targets'] as const) : []),
  ],

  extra: {
    eas: {
      // Filled in by `eas init`.
      projectId: undefined,
    },
  },
};

export default config;
