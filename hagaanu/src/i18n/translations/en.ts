import type { TranslationSchema } from './he';

/**
 * English — a structural placeholder proving the schema is language-agnostic.
 * Not wired into the language picker yet (Hebrew only in v1); adding it later is
 * a one-line change in `src/i18n/index.ts`.
 */
export const en: TranslationSchema = {
  brand: {
    name: 'Are we there?',
    slogan: 'Sleep. We’ll wake you up.',
  },

  common: {
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'OK',
    continue: 'Continue',
    notNow: 'Not now',
    openSettings: 'Open settings',
    retry: 'Try again',
    save: 'Save',
    meters: '{value} m',
    kilometers: '{value} km',
  },

  home: {
    searchPlaceholder: 'Search an address or station',
    pickDestinationHint: 'Tap the map to pick a destination',
    tapToChoose: 'Where should we wake you?',
    tapToChooseSub: 'Search an address or tap the map',
    recenter: 'My location',
    locating: 'Finding your location…',
  },

  setup: {
    destinationTitle: 'Your destination',
    radiusTitle: 'When should we wake you?',
    radiusHint: 'We’ll wake you when you get this close to the destination',
    custom: 'Custom',
    customTitle: 'Custom distance',
    customPlaceholder: 'Distance in meters',
    customRange: 'Between {min} and {max} meters',
    customInvalid: 'Enter a distance between {min} and {max} meters',
    armButton: 'Wake me up here',
    arming: 'Arming…',
    distanceFromYou: 'Distance from you: {distance}',
    changeDestination: 'Change destination',
  },

  active: {
    sleepEmoji: '😴',
    sleepTitle: 'You can sleep',
    sleepSubtitle: 'We’ll wake you before your stop.',
    destination: 'Destination',
    currentDistance: 'Current distance',
    alertRadius: 'Alarm triggers within',
    statusActive: 'Alarm is armed',
    statusWaitingFix: 'Waiting for a location fix…',
    cancelAlarm: 'Cancel alarm',
    cancelConfirmTitle: 'Cancel the alarm?',
    cancelConfirmBody: 'We won’t wake you at your destination.',
    cancelConfirmYes: 'Yes, cancel',
    notificationTitle: 'Are we there? — alarm armed',
    notificationBody: 'We’ll wake you {radius} before {destination}.',
    serviceTitle: 'Are we there? is tracking your trip',
    serviceBody: 'We’ll wake you as you approach your destination.',
  },

  alarm: {
    title: 'We’re here! 🚨',
    subtitle: 'Time to wake up',
    destination: 'Destination: {destination}',
    dismiss: 'I’m awake',
    notificationTitle: 'We’re here! 🚨',
    notificationBody: 'Time to wake up — {destination}',
  },

  permissions: {
    locationTitle: 'We need to see where you are',
    locationBody:
      'To know when you’re approaching your destination, “Are we there?” needs your location. We never store or share it — it stays on your device.',
    locationCta: 'Allow location',

    backgroundTitle: 'Even when the screen is off',
    backgroundBody:
      'To wake you before your stop, “Are we there?” needs to detect when you approach the destination even while the screen is off and the phone is in your pocket. Without it we can only wake you while the app is open.',
    backgroundBodyIOS: 'On the next screen choose “Always”. That’s what lets us wake you while the phone is locked.',
    backgroundBodyAndroid:
      'On the next screen choose “Allow all the time”. That’s what lets us wake you while the phone is locked.',
    backgroundCta: 'Allow background access',

    notificationsTitle: 'How we’ll wake you',
    notificationsBody:
      'The alarm arrives as a notification with sound and vibration — even while the phone is locked. Without notification permission we can’t wake you.',
    notificationsCta: 'Allow notifications',

    blockedTitle: 'Permission is blocked',
    blockedBody: 'Enable the permission in your device settings so “Are we there?” can wake you.',

    stepOf: 'Step {current} of {total}',
  },

  errors: {
    locationUnavailable: 'We couldn’t find your location. Check that GPS is on.',
    searchFailed: 'Search failed. Check your internet connection.',
    searchEmpty: 'No matching address found.',
    geofenceFailed: 'We couldn’t arm the alarm. Please try again.',
    servicesDisabled: 'Location services are off. Turn them on and try again.',
    unknownPlace: 'Selected destination',
  },

  warnings: {
    batteryOptimizationTitle: 'Android may suspend the app',
    batteryOptimizationBody:
      'For the alarm to fire reliably, disable battery optimization for “Are we there?” in your device settings.',
    foregroundOnly: 'Without background location we can only wake you while the app is open.',
    preciseLocationTitle: 'Precise location is off',
    preciseLocationBody: 'Without precise location the alarm may be late. You can enable it in settings.',
  },
};
