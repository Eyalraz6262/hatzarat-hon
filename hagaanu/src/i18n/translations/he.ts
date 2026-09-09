/**
 * Hebrew — the source language.
 *
 * `{placeholders}` are interpolated by `t()`. Keys are grouped by screen so a
 * translator can work through the file top to bottom.
 *
 * Voice: plain, second person plural, no exclamation marks, no cheerleading.
 * The person reading this is tired and on a bus. Every string either tells
 * them what will happen or what just happened.
 */
export const he = {
  brand: {
    name: 'הגענו?',
    slogan: 'תישנו. אנחנו נעיר אתכם.',
  },

  common: {
    cancel: 'ביטול',
    close: 'סגירה',
    confirm: 'אישור',
    continue: 'ממשיכים',
    notNow: 'לא עכשיו',
    openSettings: 'פתיחת ההגדרות',
    retry: 'שוב',
    save: 'שמירה',
    done: 'סיום',
    back: 'חזרה',
    on: 'פועל',
    off: 'כבוי',
    meters: '{value} מ׳',
    kilometers: '{value} ק״מ',
  },

  home: {
    brand: 'הגענו',
    tagline: 'תירדם בדרך. אנחנו נעיר אותך לפני היעד.',
    searchPlaceholder: 'לאן נוסעים?',
    searching: 'מחפשים…',
    noResults: 'לא מצאנו מקום כזה. נסו שם של תחנה או רחוב.',
    myLocation: 'המיקום שלי',
    useMyLocation: 'המיקום הנוכחי שלי',
    clearSearch: 'ניקוי',
    settings: 'הגדרות',
    emptyTitle: 'לאן נוסעים היום?',
    emptyBody: 'בחרו יעד ונעיר אתכם לפניו.',
    nearbyTitle: 'לנסיעה ארוכה',
    kindTrain: 'רכבת',
    kindBus: 'תחנה מרכזית',
    kindAirport: 'שדה תעופה',
    savedTitle: 'שמורים',
  },

  route: {
    changeDestination: 'שינוי יעד',
    saveThis: 'שמירת היעד',
    savePrompt: 'איך לקרוא ליעד?',
    saved: 'נשמר',
    wakeRange: 'מתי להעיר?',
    arm: 'תעירו אותי',
    arming: 'מפעילים…',
    saveDestination: 'שמירת היעד',
    earlyWarning: 'גם התרעה מוקדמת',
    earlyWarningNote: 'התראה שקטה {distance} לפני, וצלצול מלא בטווח שבחרתם.',
    addStop: 'הוספת עצירה בדרך',
    addStopHint: 'אם מחליפים כלי באמצע, אפשר להוסיף את נקודת ההחלפה. נעיר גם שם.',
    distanceNote: 'היעד במרחק {distance} מכם עכשיו.',
    removeStop: 'הסרת העצירה',
  },

  approach: {
    /* The armed screen. Only measured things are named here. */
    sleep: 'אפשר לישון',
    toGo: 'ליעד',
    toTransfer: 'להחלפה',
    window: 'התצוגה: {distance} האחרונים',
    wakeBand: 'כאן נעיר אתכם · {distance}',
    closing: 'מתקרבים',
    almost: 'עוד רגע מעירים אתכם',
    then: 'ואז',
    /* Shown under the range picker, before arming. */
    preview: 'נעיר אתכם {distance} לפני היעד.',
    radiusHint: 'ברכבת מומלץ 700 מ׳ עד 1 ק״מ. באוטובוס 300 עד 500 מ׳ בדרך כלל מספיק.',
  },

  active: {
    headline: 'ההתראה פעילה',

    body: 'הכל מוכן. אפשר לנעול את הטלפון ולנוח — ההתראה תפעל גם אם האפליקציה סגורה.',
    distanceLeft: 'מרחק ליעד',
    wakeRange: 'טווח ההתראה',
    destination: 'היעד',
    waitingFix: 'מחפשים אתכם…',
    cancel: 'ביטול ההתראה',
    cancelConfirmTitle: 'לבטל את ההתראה?',
    cancelConfirmBody: 'לא נעיר אתכם ביעד.',
    cancelConfirmYes: 'כן, בטלו',

    /* No signal. Shown on screen and in the lock-screen notification. */
    noSignal: 'אין קליטה',
    noSignalBody: 'המרחק האחרון שידענו: {distance}. נמשיך לנסות.',
    noSignalNotification: 'אין קליטה. המרחק האחרון: {distance}',


    /* Notifications. Shown on the lock screen, so short enough to read at a glance. */
    statusActive: 'ההתראה פעילה',
    notificationTitle: 'נעיר אתכם ב{destination}',
    notificationTitleLive: '{distance} ל{destination}',
    notificationBody: 'אפשר לנעול את הטלפון.',
    serviceTitle: 'הגענו? עוקבים אחרי הנסיעה',
    serviceBody: 'עדכון המיקום פועל ברקע כדי להעיר אתכם בזמן.',

    /* Shown once, after we detect the process was killed mid-trip. */
    killedTitle: 'ההתראה הופסקה על ידי המערכת',
    killedBody:
      'אנדרואיד סגר את האפליקציה ברקע באמצע הנסיעה הקודמת. אפשר למנוע את זה בהגדרות הסוללה.',
    killedAction: 'איך מתקנים',
  },

  alarm: {
    title: 'הגענו! 🚉',
    body: 'אתם מתקרבים ליעד שבחרתם.',
    dismiss: 'אני ער',
    channelGroup: 'התראות הגעה',
    notificationTitle: 'הגעתם ל{destination}',
    notificationBody: 'זה הזמן לרדת.',

    /* The distance started growing after we had been approaching. */
    overshotTitle: 'עברתם את התחנה',
    overshotBody: 'המרחק מהיעד גדל. כדאי לבדוק איפה אתם.',
    overshotScreenTitle: 'עברתם.',
    overshotScreenBody: 'התחלנו להתרחק מ{destination} בלי שההתראה הספיקה לפעול.',

    /* Signal was lost close to the destination and the estimate ran out. */
    staleTitle: 'איבדנו קליטה',
    staleBody: 'יכול להיות שהגעתם. המרחק האחרון שידענו היה {distance}.',
    staleScreenTitle: 'יכול להיות שהגעתם.',
    staleScreenBody: 'איבדנו קליטה ליד {destination}, אז אנחנו מעירים ליתר ביטחון.',

    /* The early, quiet heads-up. */
    earlyTitle: 'מתקרבים ל{destination}',
    earlyBody: 'עוד {distance}. אפשר להתחיל להתארגן.',
  },

  permissions: {
    title: 'כדי להעיר אתכם, צריך שני דברים',
    intro: 'בלי אף אחד מהם אי אפשר לדעת מתי הגעתם.',

    locationTitle: 'מיקום',
    locationBody: 'אנחנו בודקים כמה אתם רחוקים מהיעד. המיקום נשאר על המכשיר ולא נשלח לשום מקום.',
    locationAction: 'מרשים גישה למיקום',

    backgroundTitle: 'מיקום גם ברקע',
    backgroundBody: 'זה מה שמאפשר להעיר אתכם כשהמסך כבוי והטלפון בכיס. בלי זה נעיר רק אם האפליקציה פתוחה.',
    backgroundAction: 'מרשים גם ברקע',
    backgroundWhy: 'למה זה נחוץ',

    notificationsTitle: 'התראות',
    notificationsBody: 'ההתראה עצמה. בלעדיה נוכל להשמיע צליל רק כשהאפליקציה פתוחה.',
    notificationsAction: 'מרשים התראות',

    blockedTitle: 'ההרשאה חסומה',
    blockedBody: 'צריך להפעיל את ההרשאה מההגדרות של המכשיר כדי שנוכל להעיר אתכם.',
    granted: 'אושר',
    stepOf: 'שלב {current} מתוך {total}',
  },

  demo: {
    title: 'ככה זה יישמע',
    body: 'לפני שתסמכו עלינו שנעיר אתכם, כדאי לשמוע פעם אחת מה קורה כשמגיעים.',
    play: 'לשמוע איך זה נשמע',
    skip: 'לא צריך',
    sample: 'תחנת הדוגמה',
  },

  trips: {
    title: 'נסיעות',
    subtitle: 'ההתראות שהפעלתם, החדשה למעלה.',
    emptyTitle: 'עוד לא הפעלתם התראה',
    emptyBody: 'כל נסיעה שתפעילו עליה התראה תישמר כאן, על המכשיר בלבד.',
    woken: 'העיר אתכם',
    cancelled: 'בוטלה',
    open: 'פעילה',
    radius: '{distance} לפני היעד',
    clear: 'מחיקת ההיסטוריה',
    clearConfirm: 'למחוק את כל הנסיעות?',
    again: 'שוב לכאן',
    today: 'היום',
    yesterday: 'אתמול',
  },
  saved: {
    title: 'יעדים שמורים',
    add: 'שמירת היעד',
    addTitle: 'שמירת היעד',
    addPrompt: 'איך לקרוא ליעד הזה?',
    remove: 'מחיקה',
    removeHint: 'לחיצה ארוכה לאפשרויות.',
    pin: 'קיבוע בראש',
    unpin: 'ביטול הקיבוע',
    pinned: 'מקובע',
    home: 'בית',
    work: 'עבודה',
    station: 'תחנה',
    favourite: 'מועדף',
    savedConfirm: 'נשמר',
  },

  settings: {
    title: 'הגדרות',

    sectionAlarm: 'ההתראה',
    sectionApp: 'האפליקציה',
    sectionLocation: 'מיקום',
    sectionPrivacy: 'פרטיות',
    sectionHelp: 'עזרה',

    sound: {
      label: 'צליל',
      soft: 'רך',
      normal: 'רגיל',
      sharp: 'חודרת',
      softNote: 'מתחיל שקט ועולה. מעיר בלי להעיר את כל השורה.',
      normalNote: 'פעמון עולה. ברור שזו התראה, ועדיין נעים.',
      sharpNote: 'צפצוף שעון מעורר. למי שבאמת ישן עמוק.',
      preview: 'האזנה',
    },

    vibrate: 'רטט',
    vibrateNote: 'פועל גם כשהטלפון במצב שקט.',

    volume: 'עוצמה',
    volumeNote:
      'זו העוצמה של הנגן שלנו, לא של המכשיר. אפליקציה לא יכולה לשנות את עוצמת המערכת.',

    defaultRadius: 'טווח ברירת מחדל',
    defaultRadiusNote: 'הטווח שייבחר מראש בכל נסיעה חדשה.',

    language: 'שפה',
    languageRestartNote:
      'המעבר בין שפה שנקראת מימין לשמאל לשפה שנקראת משמאל לימין דורש הפעלה מחדש של האפליקציה כדי שהפריסה תתהפך.',

    theme: 'תצוגה',
    themeSystem: 'לפי המערכת',
    themeLight: 'בהיר',
    themeDark: 'כהה',

    demo: 'הרצת דוגמה',
    demoNote: 'משמיע את הצליל שבחרתם ומראה את מסך ההגעה.',


    privacyTitle: 'מה יוצא מהמכשיר',
    privacyBody:
      'המיקום שלכם נשאר על הטלפון ואינו נשלח לשום שרת שלנו. רשימת התחנות ארוזה בתוך האפליקציה, כך שרוב החיפושים לא יוצאים מהמכשיר בכלל. היוצא מן הכלל הוא חיפוש כתובת שאינה תחנה, ולחיצה על נקודה במפה שאין בה תחנה: הטקסט או שתי הקואורדינטות עוברים לשירות המיפוי של המכשיר — Apple ב‑iOS, Google באנדרואיד — כדי לקבל שם של מקום. מרגע ההפעלה האפליקציה לא נוגעת ברשת בכלל.',

    whyNotWork: 'למה ההתראה לא עבדה?',
    whyNotWorkBody:
      'שתי מערכות ההפעלה שומרות לעצמן את הזכות לעכב אירועי רקע כדי לחסוך סוללה, ואנדרואיד גם סוגר אפליקציות רקע. אנחנו משתמשים בשלוש שכבות זיהוי כדי לצמצם את זה, אבל אף אפליקציה לא יכולה להבטיח מאה אחוז.',
    batteryTitle: 'חיסכון סוללה באנדרואיד',
    batteryBody:
      'יצרנים כמו שיאומי, סמסונג ואופו סוגרים אפליקציות רקע באגרסיביות. הוצאת האפליקציה מחיסכון הסוללה היא התיקון היחיד שבאמת עוזר.',
    batteryAction: 'פתיחת הגדרות הסוללה',

    version: 'גרסה {version}',
    dataCredit:
      'רשימת התחנות מבוססת על נתוני התחבורה הציבורית (GTFS) של משרד התחבורה — מידע ממשלתי פתוח.',
  },


  errors: {
    locationUnavailable: 'לא הצלחנו לאתר אתכם. בדקו שה־GPS פועל.',
    searchFailed: 'החיפוש נכשל. בדקו את החיבור לאינטרנט.',
    armFailed: 'לא הצלחנו להפעיל את ההתראה. נסו שוב.',
    unknownPlace: 'היעד שבחרתם',
  },

  warnings: {
    foregroundOnly: 'בלי הרשאת מיקום ברקע נעיר אתכם רק כשהאפליקציה פתוחה.',
    batteryOptimisation:
      'אנדרואיד עלול לעצור אפליקציות ברקע. אם ההתראה לא עבדה, בטלו את חיסכון הסוללה עבור האפליקציה.',
  },

  /* Only shown in the browser demo, where the OS layers do not exist. */
  web: {
    mapHint: 'לחצו במפה כדי לבחור יעד',
    banner: 'הדגמה בדפדפן',
    bannerBody: 'דפדפן לא יכול לרשום גיאופנס במערכת ההפעלה ולא להעיר לשונית סגורה. כאן אפשר להפעיל ולראות את כל המסכים — הנסיעה עצמה מדומה.',
    simulate: 'הרצת נסיעה',
    simulating: 'נוסעים…',
    simulateNote: 'מזיז אתכם ליעד בכ‑40 שניות, כדי לראות את המסך משתנה ואת ההתראה מצלצלת.',
    reset: 'התחלה מחדש',
  },

  tabs: {
    home: 'בית',
    saved: 'שמורים',
    trips: 'נסיעות',
  },

  onboarding: {
    /* Three screens, and each one earns its place: the problem, the control,
       the promise. No dots-and-skip carousel. */
    oneTitle: 'תירדם בראש שקט',
    oneBody: 'בחרו יעד ואנחנו נעקוב אחרי הדרך במקומכם.',
    twoTitle: 'נעיר אתכם בזמן',
    twoBody: 'קבלו התראה כשאתם מתקרבים ליעד, לא אחריו.',
    threeTitle: 'גם כשהמסך נעול',
    threeBody: 'נבקש מיקום ברקע רק כשתפעילו התראה, כדי שהיא תמשיך לעבוד.',
    start: 'מתחילים',
    skip: 'דילוג',
  },

  places: {
    title: 'היעדים שלכם',
    saved: 'שמורים',
    recent: 'אחרונים',
    empty: 'עוד אין יעדים שמורים.',
    emptyBody: 'כל יעד שתפעילו עליו התראה יופיע כאן, ואפשר לשמור אותו בכוכב.',
    goToMap: 'לבחירת יעד',
    useAgain: 'הפעלה מחדש',
  },

  snooze: {
    action: 'עוד 2 דקות',
    active: 'נעיר אתכם שוב בעוד 2 דקות',
  },

  status: {
    /* The states a screen can be in, said in the app's own voice. */
    noGps: 'אין קליטת GPS',
    noGpsBody: 'לא הצלחנו לאתר אתכם. בדקו שהמיקום מופעל במכשיר.',
    noNetwork: 'אין חיבור לאינטרנט',
    noNetworkBody: 'חיפוש כתובות דורש רשת. אפשר לבחור יעד בלחיצה על המפה.',
    locationDenied: 'הרשאת המיקום כבויה',
    locationDeniedBody: 'בלי מיקום אי אפשר לדעת מתי הגעתם.',
    searching: 'מחפשים…',
    locating: 'מאתרים אתכם…',
  },
};

/**
 * The shape every language must fill.
 *
 * Derived from Hebrew because Hebrew is the source: a key added there fails
 * the other builds until it is translated, rather than falling back silently
 * at runtime. The tree nests to three levels in places (rail.fallback,
 * settings.sound) and the recursive key type in ../index.ts walks all of it.
 */
export type TranslationSchema = typeof he;
