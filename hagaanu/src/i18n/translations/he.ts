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
    meters: '{value} מ׳',
    kilometers: '{value} ק״מ',
  },

  home: {
    searchPlaceholder: 'לאן נוסעים?',
    searching: 'מחפשים…',
    noResults: 'לא מצאנו מקום כזה. נסו שם של תחנה או רחוב.',
    myLocation: 'המיקום שלי',
    clearSearch: 'ניקוי',
    pickOnMap: 'בחרו יעד על המפה או חפשו אותו',
    emptyTitle: 'לאן נוסעים היום?',
    emptyBody: 'בחרו יעד ונעיר אתכם לפניו.',
    locating: 'מאתרים אתכם…',
  },

  route: {
    title: 'הדרך שלכם',
    changeDestination: 'שינוי יעד',
    wakeRange: 'מתי להעיר?',
    arm: 'תעירו אותי',
    arming: 'מפעילים…',
    saveDestination: 'שמירת היעד',
    savedDestinations: 'יעדים שמורים',
  },

  rail: {
    here: 'אתם כאן',
    wakeHere: 'כאן נעיר אתכם, {distance} לפני',
    loading: 'טוענים את התחנות בדרך',
    fallback: {
      offline: 'לא הצלחנו לטעון את התחנות בדרך. ההתראה עצמה תעבוד בדיוק אותו דבר.',
      'none-found': 'אין לנו תחנות מסומנות בקטע הזה. ההתראה תפעל לפי מרחק.',
      'too-far': 'המסלול ארוך מדי בשביל רשימת תחנות. ההתראה תפעל לפי מרחק.',
    },
  },

  active: {
    title: 'אנחנו שומרים עליכם.',
    body: 'אפשר לנעול את הטלפון. ההתראה תפעל גם אם האפליקציה סגורה.',
    stopsToGo: 'תחנות עד שנעיר אתכם',
    stopsToGoOne: 'תחנה עד שנעיר אתכם',
    almostThere: 'עוד רגע מעירים אתכם',
    distanceLeft: 'מרחק ליעד',
    wakeRange: 'טווח ההתראה',
    destination: 'היעד',
    waitingFix: 'מחפשים אתכם…',
    cancel: 'ביטול ההתראה',
    cancelConfirmTitle: 'לבטל את ההתראה?',
    cancelConfirmBody: 'לא נעיר אתכם ביעד.',
    cancelConfirmYes: 'כן, בטלו',

    /* Notifications. Shown on the lock screen, so short enough to read at a glance. */
    statusActive: 'ההתראה פעילה',
    notificationTitle: 'נעיר אתכם ב{destination}',
    notificationTitleLive: '{distance} ל{destination}',
    notificationBody: 'אפשר לנעול את הטלפון.',
    serviceTitle: 'הגענו? עוקבים אחרי הנסיעה',
    serviceBody: 'עדכון המיקום פועל ברקע כדי להעיר אתכם בזמן.',
  },

  alarm: {
    title: 'הגעתם.',
    body: '{destination} ממש כאן.',
    dismiss: 'אני ער',
    notificationTitle: 'הגעתם ל{destination}',
    notificationBody: 'זה הזמן לרדת.',
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

  saved: {
    title: 'יעדים שמורים',
    add: 'שמירת היעד',
    addTitle: 'שמירת היעד',
    addPrompt: 'איך לקרוא ליעד הזה?',
    remove: 'מחיקה',
    removeHint: 'לחיצה ארוכה מוחקת את היעד.',
    removeConfirm: 'למחוק את ״{name}״?',
    home: 'בית',
    work: 'עבודה',
    station: 'תחנה',
    favourite: 'מועדף',
    savedConfirm: 'נשמר',
  },

  errors: {
    locationUnavailable: 'לא הצלחנו לאתר אתכם. בדקו שה־GPS פועל.',
    searchFailed: 'החיפוש נכשל. בדקו את החיבור לאינטרנט.',
    armFailed: 'לא הצלחנו להפעיל את ההתראה. נסו שוב.',
    unknownPlace: 'היעד שבחרתם',
  },

  warnings: {
    foregroundOnly: 'בלי הרשאת מיקום ברקע נעיר אתכם רק כשהאפליקציה פתוחה.',
    batteryOptimisation: 'אנדרואיד עלול לעצור אפליקציות ברקע. אם ההתראה לא עבדה, בטלו את חיסכון הסוללה עבור האפליקציה.',
  },
};

/**
 * The shape every language must fill.
 *
 * Derived from Hebrew because Hebrew is the source: a key added there fails
 * the English build until it is translated, rather than falling back silently
 * at runtime.
 */
export type TranslationSchema = typeof he;
