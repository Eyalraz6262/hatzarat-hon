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
    searchPlaceholder: 'לאן נוסעים?',
    searching: 'מחפשים…',
    noResults: 'לא מצאנו מקום כזה. נסו שם של תחנה או רחוב.',
    myLocation: 'המיקום שלי',
    clearSearch: 'ניקוי',
    settings: 'הגדרות',
    emptyTitle: 'לאן נוסעים היום?',
    emptyBody: 'בחרו יעד ונעיר אתכם לפניו.',
  },

  route: {
    changeDestination: 'שינוי יעד',
    wakeRange: 'מתי להעיר?',
    arm: 'תעירו אותי',
    arming: 'מפעילים…',
    saveDestination: 'שמירת היעד',
    earlyWarning: 'גם התרעה מוקדמת',
    earlyWarningNote: 'התראה שקטה {distance} לפני, וצלצול מלא בטווח שבחרתם.',
    addStop: 'הוספת עצירה בדרך',
    addStopHint: 'אם מחליפים כלי באמצע, אפשר להוסיף את נקודת ההחלפה. נעיר גם שם.',
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
  },

  active: {
    body: 'אפשר לנעול את הטלפון. ההתראה תפעל גם אם האפליקציה סגורה.',
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
    title: 'הגעתם.',
    body: '{destination} ממש כאן.',
    dismiss: 'אני ער',
    wakeAgain: 'תעירו שוב ביעד עצמו',
    wakeAgainDone: 'נעיר אתכם שוב',
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

    crashReports: 'דוחות קריסה',
    crashReportsNote:
      'עוזר לתקן תקלות שגורמות להתראה לא לפעול. בלי מיקום, בלי מזהה, בלי מעקב שימוש.',

    privacyTitle: 'מה יוצא מהמכשיר',
    privacyBody:
      'המיקום שלכם נשאר על הטלפון ולא נשלח לשום שרת. היוצא מן הכלל היחיד: כשבוחרים יעד, שתי קואורדינטות נשלחות ל־OpenStreetMap כדי לקבל את התחנות בדרך. פעם אחת, בלי מזהה. מרגע ההפעלה האפליקציה לא נוגעת ברשת בכלל.',

    whyNotWork: 'למה ההתראה לא עבדה?',
    whyNotWorkBody:
      'שתי מערכות ההפעלה שומרות לעצמן את הזכות לעכב אירועי רקע כדי לחסוך סוללה, ואנדרואיד גם סוגר אפליקציות רקע. אנחנו משתמשים בשלוש שכבות זיהוי כדי לצמצם את זה, אבל אף אפליקציה לא יכולה להבטיח מאה אחוז.',
    batteryTitle: 'חיסכון סוללה באנדרואיד',
    batteryBody:
      'יצרנים כמו שיאומי, סמסונג ואופו סוגרים אפליקציות רקע באגרסיביות. הוצאת האפליקציה מחיסכון הסוללה היא התיקון היחיד שבאמת עוזר.',
    batteryAction: 'פתיחת הגדרות הסוללה',

    version: 'גרסה {version}',
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
