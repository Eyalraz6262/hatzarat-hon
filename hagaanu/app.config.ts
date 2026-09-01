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

const config: ExpoConfig = {
  name: 'הגענו?',
  slug: 'hagaanu',
  scheme: 'hagaanu',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#14161C',

  ios: {
    bundleIdentifier: 'com.hagaanu.app',
    supportsTablet: false,
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

  android: {
    package: 'com.hagaanu.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#14161C',
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
        color: '#FF6B1A',
        // Copies the alarm tone into res/raw (Android) and the app bundle (iOS)
        // so the notification itself can play it — including when our JS process
        // is gone by the time the notification is shown.
        sounds: ['./assets/sounds/alarm.wav'],
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
        backgroundColor: '#14161C',
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
  ],

  extra: {
    eas: {
      // Filled in by `eas init`.
      projectId: undefined,
    },
  },
};

export default config;
