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
    done: 'Done',
    back: 'Back',
    on: 'On',
    off: 'Off',
    meters: '{value} m',
    kilometers: '{value} km',
  },

  home: {
    searchPlaceholder: 'Where are you going?',
    searching: 'Searching…',
    noResults: 'No match. Try a station or street name.',
    myLocation: 'My location',
    clearSearch: 'Clear',
    settings: 'Settings',
    emptyTitle: 'Where are you headed?',
    emptyBody: 'Pick a destination and we will wake you before it.',
    nearbyTitle: 'For a long ride',
    kindTrain: 'Train',
    kindBus: 'Bus terminal',
    kindAirport: 'Airport',
    savedTitle: 'Saved',
  },

  route: {
    changeDestination: 'Change destination',
    wakeRange: 'When should we wake you?',
    arm: 'Wake me',
    arming: 'Setting up…',
    saveDestination: 'Save destination',
    earlyWarning: 'Add an early heads-up',
    earlyWarningNote: 'A silent notice {distance} before, and the full alarm at your chosen range.',
    addStop: 'Add a stop on the way',
    addStopHint: 'Changing vehicle on the way? Add where. We will wake you there too.',
    distanceNote: 'The destination is {distance} away right now.',
    removeStop: 'Remove this stop',
  },

  approach: {
    sleep: 'You can sleep',
    toGo: 'to go',
    toTransfer: 'to the change',
    window: 'Showing the last {distance}',
    wakeBand: 'We wake you here · {distance}',
    closing: 'Getting close',
    almost: 'Waking you any moment',
    then: 'Then',
    preview: 'We will wake you {distance} before the destination.',
  },

  active: {
    body: 'Lock your phone. The alarm works with the app closed.',
    distanceLeft: 'Distance to go',
    wakeRange: 'Alert range',
    destination: 'Destination',
    waitingFix: 'Finding you…',
    cancel: 'Cancel alarm',
    cancelConfirmTitle: 'Cancel the alarm?',
    cancelConfirmBody: 'We will not wake you at your destination.',
    cancelConfirmYes: 'Yes, cancel',

    noSignal: 'No signal',
    noSignalBody: 'Last distance we knew: {distance}. We are still trying.',
    noSignalNotification: 'No signal. Last distance: {distance}',


    statusActive: 'Alarm active',
    notificationTitle: 'We will wake you at {destination}',
    notificationTitleLive: '{distance} to {destination}',
    notificationBody: 'You can lock your phone.',
    serviceTitle: 'Are we there? tracking your trip',
    serviceBody: 'Location updates run in the background so we can wake you in time.',

    killedTitle: 'The system stopped your alarm',
    killedBody: 'Android closed the app in the background during your last trip. Battery settings can prevent this.',
    killedAction: 'How to fix it',
  },

  alarm: {
    title: 'You are here.',
    body: '{destination} is right here.',
    dismiss: 'I am awake',
    channelGroup: 'Arrival alarms',
    notificationTitle: 'You have reached {destination}',
    notificationBody: 'Time to get off.',

    overshotTitle: 'You passed your stop',
    overshotBody: 'The distance is growing. Check where you are.',
    overshotScreenTitle: 'You passed it.',
    overshotScreenBody: 'You started moving away from {destination} before the alarm could fire.',

    staleTitle: 'We lost signal',
    staleBody: 'You may have arrived. The last distance we knew was {distance}.',
    staleScreenTitle: 'You may have arrived.',
    staleScreenBody: 'We lost signal near {destination}, so we are waking you to be safe.',

    earlyTitle: 'Approaching {destination}',
    earlyBody: '{distance} to go. Time to get ready.',
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

  demo: {
    title: 'This is what it sounds like',
    body: 'Before you trust us to wake you, it is worth hearing once what happens when you arrive.',
    play: 'Hear how it sounds',
    skip: 'No need',
    sample: 'Sample stop',
  },

  saved: {
    title: 'Saved destinations',
    add: 'Save destination',
    addTitle: 'Save this destination',
    addPrompt: 'What should we call it?',
    remove: 'Delete',
    removeHint: 'Long-press for options.',
    pin: 'Pin to the front',
    unpin: 'Unpin',
    pinned: 'Pinned',
    home: 'Home',
    work: 'Work',
    station: 'Station',
    favourite: 'Favourite',
    savedConfirm: 'Saved',
  },

  settings: {
    title: 'Settings',

    sectionAlarm: 'The alarm',
    sectionApp: 'The app',
    sectionLocation: 'Location',
    sectionPrivacy: 'Privacy',
    sectionHelp: 'Help',

    sound: {
      label: 'Sound',
      soft: 'Soft',
      normal: 'Normal',
      sharp: 'Piercing',
      softNote: 'Starts quiet and rises. Wakes you without waking the whole row.',
      normalNote: 'A rising bell. Clearly an alarm, still pleasant.',
      sharpNote: 'An alarm-clock beep. For people who really sleep through things.',
      preview: 'Listen',
    },

    vibrate: 'Vibration',
    vibrateNote: 'Works even when the phone is on silent.',

    volume: 'Volume',
    volumeNote: 'This is our player level, not the device level. An app cannot change system volume.',

    defaultRadius: 'Default range',
    defaultRadiusNote: 'The range pre-selected on every new trip.',

    language: 'Language',
    languageRestartNote: 'Switching between a right-to-left and a left-to-right language needs an app restart before the layout mirrors.',

    theme: 'Appearance',
    themeSystem: 'Follow the system',
    themeLight: 'Light',
    themeDark: 'Dark',

    demo: 'Run the demo',
    demoNote: 'Plays your chosen sound and shows the arrival screen.',


    privacyTitle: 'What leaves your device',
    privacyBody:
      'Your location stays on the phone and is never sent to a server of ours. The stop list is bundled into the app, so most searches never leave the device at all. The exception is searching for an address that is not a stop, or tapping a point on the map with no stop on it: the text or the two coordinates go to the phone\'s own map service — Apple on iOS, Google on Android — to get a place name. Once armed, the app does not touch the network at all.',

    whyNotWork: 'Why did the alarm not fire?',
    whyNotWorkBody: 'Both operating systems reserve the right to delay background events to save battery, and Android also closes background apps. We use three detection layers to narrow that gap, but no app can promise a hundred percent.',
    batteryTitle: 'Android battery saving',
    batteryBody: 'Manufacturers like Xiaomi, Samsung and Oppo close background apps aggressively. Exempting the app from battery optimisation is the one fix that really helps.',
    batteryAction: 'Open battery settings',

    version: 'Version {version}',
    dataCredit:
      'Stop names and locations come from the Ministry of Transport public transport feed (GTFS), Israeli open government data.',
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

  web: {
    mapHint: 'Tap the map to choose a destination',
    banner: 'Browser demo',
    bannerBody: 'A browser cannot register an OS geofence or wake a closed tab. Here you can arm it and see every screen — the journey itself is simulated.',
    simulate: 'Run the journey',
    simulating: 'Travelling…',
    simulateNote: 'Moves you to the destination in about 40 seconds, so you can watch the screen change and the alarm fire.',
    reset: 'Start again',
  },

  tabs: { map: 'Map', places: 'Places', settings: 'Settings' },

  onboarding: {
    oneTitle: 'Fell asleep on the bus?',
    oneBody: 'It happens to everyone. Hagaanu keeps watch while you sleep.',
    twoTitle: 'Pick a destination',
    twoBody: 'Mark where you get off, and how far out to wake you.',
    threeTitle: 'And go to sleep',
    threeBody: 'Lock the phone. As you near the destination, it rings.',
    start: 'Get started',
    skip: 'Skip',
  },

  places: {
    title: 'Your places',
    saved: 'Saved',
    recent: 'Recent',
    empty: 'No saved places yet.',
    emptyBody: 'Every destination you set an alarm for shows up here, and a star keeps it.',
    goToMap: 'Pick a destination',
    useAgain: 'Use again',
  },

  snooze: { action: '2 more minutes', active: 'We will wake you again in 2 minutes' },

  status: {
    noGps: 'No GPS signal',
    noGpsBody: 'We could not locate you. Check that location is on.',
    noNetwork: 'No internet connection',
    noNetworkBody: 'Address search needs a network. You can tap the map instead.',
    locationDenied: 'Location permission is off',
    locationDeniedBody: 'Without location there is no way to know when you have arrived.',
    searching: 'Searching…',
    locating: 'Locating you…',
  },
};
