/**
 * Hebrew — the source language.
 *
 * `{placeholders}` are interpolated by `t()`. Keep keys sorted by screen/domain
 * so a translator can work through the file top to bottom.
 */
export const he = {
  brand: {
    name: 'הגענו?',
    slogan: 'תישן. אנחנו נעיר אותך.',
  },

  /**
   * Latin signage labels. These are set in IBM Plex Mono, which has no Hebrew
   * coverage — so they stay Latin in every language, like the codes on a real
   * ticket. Do not translate them into Hebrew.
   */
  plate: {
    destination: 'DESTINATION',
    metres: 'METRES',
    permissions: 'PERMISSIONS',
    wakePass: 'WAKE PASS',
    live: 'LIVE',
    saved: 'SAVED',
    alarm: 'ALARM',
  },

  common: {
    cancel: 'ביטול',
    close: 'סגירה',
    confirm: 'אישור',
    continue: 'המשך',
    notNow: 'לא עכשיו',
    openSettings: 'פתיחת הגדרות',
    retry: 'נסה שוב',
    save: 'שמירה',
    meters: '{value} מ׳',
    kilometers: '{value} ק״מ',
  },

  home: {
    searchPlaceholder: 'חיפוש כתובת או תחנה',
    pickDestinationHint: 'לחצו על המפה כדי לבחור יעד',
    tapToChoose: 'איפה להעיר אתכם?',
    tapToChooseSub: 'חפשו כתובת או לחצו על המפה',
    recenter: 'המיקום שלי',
    locating: 'מאתר את המיקום שלך…',
  },

  setup: {
    destinationTitle: 'היעד שלך',
    radiusTitle: 'באיזה מרחק להעיר?',
    radiusHint: 'נעיר אתכם כשתיכנסו למרחק הזה מהיעד',
    custom: 'מותאם אישית',
    customTitle: 'מרחק מותאם אישית',
    customPlaceholder: 'מרחק במטרים',
    customRange: 'בין {min} ל־{max} מטר',
    customInvalid: 'יש להזין מרחק בין {min} ל־{max} מטר',
    armButton: 'תעיר אותי כאן',
    arming: 'מפעיל…',
    distanceFromYou: 'מרחק ממך: {distance}',
    changeDestination: 'שינוי יעד',
  },

  active: {
    sleepTitle: 'אפשר לישון',
    sleepSubtitle: 'אנחנו נעיר אותך לפני היעד.',
    destination: 'יעד',
    currentDistance: 'מרחק נוכחי',
    alertRadius: 'ההתראה תופעל בטווח',
    statusActive: 'ההתראה פעילה',
    statusWaitingFix: 'ממתין לקליטת מיקום…',
    cancelAlarm: 'ביטול ההתראה',
    cancelConfirmTitle: 'לבטל את ההתראה?',
    cancelConfirmBody: 'לא נעיר אתכם ביעד.',
    cancelConfirmYes: 'כן, בטלו',
    notificationTitle: 'הגענו? — ההתראה פעילה',
    notificationTitleLive: 'עוד {distance} ליעד',
    notificationBody: 'נעיר אתכם {radius} לפני {destination}.',
    serviceTitle: 'הגענו? עוקבת אחרי הנסיעה',
    serviceBody: 'נעיר אתכם כשתתקרבו ליעד.',
  },

  alarm: {
    title: 'הגענו!',
    subtitle: 'הגיע הזמן להתעורר',
    destination: 'היעד: {destination}',
    dismiss: 'אני ער',
    notificationTitle: 'הגענו!',
    notificationBody: 'הגיע הזמן להתעורר — {destination}',
    ticketCode: 'HGN·{radius}',
  },

  permissions: {
    locationTitle: 'צריך לראות איפה אתם',
    locationBody:
      'כדי לדעת מתי אתם מתקרבים ליעד, ״הגענו?״ צריכה גישה למיקום שלכם. אנחנו לא שומרים ולא משתפים אותו — הוא נשאר על המכשיר.',
    locationCta: 'אשרו גישה למיקום',

    backgroundTitle: 'גם כשהמסך כבוי',
    backgroundBody:
      'כדי להעיר אתכם לפני התחנה, ״הגענו?״ צריכה לזהות מתי אתם מתקרבים ליעד גם כשהמסך כבוי והטלפון בכיס. בלי זה נוכל להעיר אתכם רק כשהאפליקציה פתוחה.',
    backgroundBodyIOS:
      'במסך הבא בחרו ״תמיד״ (Always). זה מה שמאפשר לנו להעיר אתכם כשהטלפון נעול.',
    backgroundBodyAndroid:
      'במסך הבא בחרו ״אפשר תמיד״. זה מה שמאפשר לנו להעיר אתכם כשהטלפון נעול.',
    backgroundCta: 'אפשרו גישה ברקע',

    notificationsTitle: 'איך נעיר אתכם',
    notificationsBody:
      'ההתראה מגיעה כהתראה עם צליל ורטט — גם כשהטלפון נעול. בלי אישור התראות לא נוכל להעיר אתכם.',
    notificationsCta: 'אשרו התראות',

    blockedTitle: 'ההרשאה חסומה',
    blockedBody: 'צריך להפעיל את ההרשאה מהגדרות המכשיר כדי ש״הגענו?״ תוכל להעיר אתכם.',

    stepOf: 'שלב {current} מתוך {total}',
  },

  saved: {
    title: 'יעדים שמורים',
    subtitle: 'הקשה אחת מפעילה את ההתראה.',
    add: 'הוספת יעד',
    addTitle: 'שמירת היעד',
    addPrompt: 'איך לקרוא ליעד הזה?',
    empty: 'עדיין אין יעדים שמורים.',
    emptyHint: 'שמרו יעד אחרי שתבחרו אותו על המפה.',
    remove: 'מחיקה',
    removeConfirm: 'למחוק את ״{name}״?',
    home: 'בית',
    work: 'עבודה',
    station: 'תחנה',
    favourite: 'מועדף',
    saveCurrent: 'שמירת היעד',
    savedConfirm: 'נשמר',
  },

  errors: {
    locationUnavailable: 'לא הצלחנו לאתר את המיקום שלך. בדקו שה־GPS פועל.',
    searchFailed: 'החיפוש נכשל. בדקו את החיבור לאינטרנט.',
    searchEmpty: 'לא נמצאה כתובת מתאימה.',
    geofenceFailed: 'לא הצלחנו להפעיל את ההתראה. נסו שוב.',
    servicesDisabled: 'שירותי המיקום כבויים במכשיר. הפעילו אותם ונסו שוב.',
    unknownPlace: 'יעד שנבחר',
  },

  warnings: {
    batteryOptimizationTitle: 'אנדרואיד עלול להשהות את האפליקציה',
    batteryOptimizationBody:
      'כדי שההתראה תעבוד בוודאות, בטלו את אופטימיזציית הסוללה עבור ״הגענו?״ בהגדרות המכשיר.',
    foregroundOnly: 'בלי הרשאת מיקום ברקע נעיר אתכם רק כשהאפליקציה פתוחה.',
    preciseLocationTitle: 'המיקום המדויק כבוי',
    preciseLocationBody: 'בלי מיקום מדויק ההתראה עלולה לאחר. אפשר להפעיל אותו בהגדרות.',
  },
} as const;

/**
 * Recursively widens the literal types produced by `as const` back to `string`.
 * Without it every other language would be required to repeat the Hebrew text
 * verbatim, while the shape (the set of keys) is exactly what we want to enforce.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type TranslationSchema = Widen<typeof he>;
