import type { TranslationSchema } from './he';

/**
 * English.
 *
 * Typed against the Hebrew source, so a key added there fails the build here
 * until it is translated rather than falling back silently at runtime.
 */
export const en: TranslationSchema = {
  brand: {
    name: 'Are we there?',
    slogan: 'Sleep. We will wake you.',
  },

  common: {
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    continue: 'Continue',
    notNow: 'Not now',
    openSettings: 'Open settings',
    retry: 'Try again',
    save: 'Save',
    meters: '{value} m',
    kilometers: '{value} km',
  },

  home: {
    searchPlaceholder: 'Where are you going?',
    searching: 'Searching…',
    noResults: 'No match. Try a station or street name.',
    myLocation: 'My location',
    clearSearch: 'Clear',
    pickOnMap: 'Search for your destination or tap the map',
    emptyTitle: 'Where are you headed?',
    emptyBody: 'Pick a destination and we will wake you before it.',
    locating: 'Finding you…',
  },

  route: {
    title: 'Your journey',
    changeDestination: 'Change destination',
    wakeRange: 'When should we wake you?',
    arm: 'Wake me',
    arming: 'Setting up…',
    saveDestination: 'Save destination',
    savedDestinations: 'Saved destinations',
  },

  rail: {
    here: 'You are here',
    wakeHere: 'We wake you here, {distance} before',
    loading: 'Loading the stops on your route',
    fallback: {
      offline: 'We could not load the stops on this route. The alarm itself works exactly the same.',
      'none-found': 'No mapped stops on this stretch. The alarm will use distance instead.',
      'too-far': 'This route is too long for a stop list. The alarm will use distance instead.',
    },
  },

  active: {
    title: 'We have got you.',
    body: 'Lock your phone. The alarm works with the app closed.',
    stopsToGo: 'stops until we wake you',
    stopsToGoOne: 'stop until we wake you',
    almostThere: 'Waking you in a moment',
    distanceLeft: 'Distance to go',
    wakeRange: 'Alert range',
    destination: 'Destination',
    waitingFix: 'Finding you…',
    cancel: 'Cancel alarm',
    cancelConfirmTitle: 'Cancel the alarm?',
    cancelConfirmBody: 'We will not wake you at your destination.',
    cancelConfirmYes: 'Yes, cancel',

    statusActive: 'Alarm active',
    notificationTitle: 'We will wake you at {destination}',
    notificationTitleLive: '{distance} to {destination}',
    notificationBody: 'You can lock your phone.',
    serviceTitle: 'Are we there? tracking your trip',
    serviceBody: 'Location updates run in the background so we can wake you in time.',
  },

  alarm: {
    title: 'You are here.',
    body: '{destination} is right here.',
    dismiss: 'I am awake',
    notificationTitle: 'You have reached {destination}',
    notificationBody: 'Time to get off.',
  },

  permissions: {
    title: 'Two things, so we can wake you',
    intro: 'Without either one there is no way to know when you have arrived.',

    locationTitle: 'Location',
    locationBody: 'We check how far you are from your destination. It stays on your device and is never sent anywhere.',
    locationAction: 'Allow location',

    backgroundTitle: 'Location in the background',
    backgroundBody: 'This is what lets us wake you with the screen off and the phone in your pocket. Without it we can only wake you while the app is open.',
    backgroundAction: 'Allow in the background',
    backgroundWhy: 'Why this is needed',

    notificationsTitle: 'Notifications',
    notificationsBody: 'The alarm itself. Without it we can only make a sound while the app is open.',
    notificationsAction: 'Allow notifications',

    blockedTitle: 'Permission blocked',
    blockedBody: 'Enable the permission in your device settings so we can wake you.',
    granted: 'Allowed',
    stepOf: 'Step {current} of {total}',
  },

  saved: {
    title: 'Saved destinations',
    add: 'Save destination',
    addTitle: 'Save this destination',
    addPrompt: 'What should we call it?',
    remove: 'Delete',
    removeHint: 'Long-press to delete.',
    removeConfirm: 'Delete “{name}”?',
    home: 'Home',
    work: 'Work',
    station: 'Station',
    favourite: 'Favourite',
    savedConfirm: 'Saved',
  },

  errors: {
    locationUnavailable: 'We could not find you. Check that GPS is on.',
    searchFailed: 'Search failed. Check your connection.',
    armFailed: 'We could not start the alarm. Try again.',
    unknownPlace: 'Your destination',
  },

  warnings: {
    foregroundOnly: 'Without background location we can only wake you while the app is open.',
    batteryOptimisation: 'Android may stop background apps. If the alarm did not fire, turn off battery optimisation for this app.',
  },
};
