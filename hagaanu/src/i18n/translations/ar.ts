import type { TranslationSchema } from './he';

/**
 * Arabic.
 *
 * NEEDS A NATIVE REVIEW BEFORE RELEASE. This is a careful first pass, not a
 * professional translation, and it is marked as such in the spec. Two things
 * a reviewer should look at specifically:
 *
 *   - The alarm strings are read by someone half asleep. Register matters
 *     more than literal accuracy there.
 *   - Place names stay in whatever form the map returns them, which will
 *     usually be Hebrew or English. That is deliberate: a passenger matching
 *     a sign on a platform needs the string on the sign.
 *
 * Arabic is right-to-left, so the layout already works — it is the same
 * mirroring Hebrew uses.
 */
export const ar: TranslationSchema = {
  brand: {
    name: 'وصلنا؟',
    slogan: 'نم. سنوقظك.',
  },

  common: {
    cancel: 'إلغاء',
    close: 'إغلاق',
    confirm: 'تأكيد',
    continue: 'متابعة',
    notNow: 'ليس الآن',
    openSettings: 'فتح الإعدادات',
    retry: 'إعادة المحاولة',
    save: 'حفظ',
    done: 'تم',
    back: 'رجوع',
    on: 'مفعّل',
    off: 'متوقف',
    meters: '{value} م',
    kilometers: '{value} كم',
  },

  home: {
    searchPlaceholder: 'إلى أين أنت ذاهب؟',
    searching: 'جارٍ البحث…',
    noResults: 'لا توجد نتيجة. جرّب اسم محطة أو شارع.',
    myLocation: 'موقعي',
    clearSearch: 'مسح',
    settings: 'الإعدادات',
    emptyTitle: 'إلى أين اليوم؟',
    emptyBody: 'اختر وجهتك وسنوقظك قبلها.',
  },

  route: {
    title: 'رحلتك',
    changeDestination: 'تغيير الوجهة',
    wakeRange: 'متى نوقظك؟',
    arm: 'أيقظني',
    arming: 'جارٍ التفعيل…',
    saveDestination: 'حفظ الوجهة',
    earlyWarning: 'تنبيه مبكر أيضاً',
    earlyWarningNote: 'إشعار صامت على بُعد {distance}، ثم المنبّه الكامل عند المسافة التي اخترتها.',
    addStop: 'إضافة محطة في الطريق',
    removeStop: 'إزالة المحطة',
    stopAdded: 'سنوقظك هنا أيضاً',
  },

  rail: {
    here: 'أنت هنا',
    wakeHere: 'سنوقظك هنا، على بُعد {distance}',
    earlyHere: 'تنبيه صامت، على بُعد {distance}',
    transfer: 'تبديل',
    loading: 'جارٍ تحميل المحطات على الطريق',
    fallback: {
      offline: 'لم نتمكن من تحميل المحطات على هذا الطريق. المنبّه نفسه يعمل تماماً كالمعتاد.',
      'none-found': 'لا توجد محطات مسجّلة على هذا المقطع. سيعتمد المنبّه على المسافة.',
      'too-far': 'الطريق أطول من أن نعرض قائمة محطات. سيعتمد المنبّه على المسافة.',
    },
  },

  active: {
    title: 'نحن نراقب من أجلك.',
    body: 'يمكنك قفل الهاتف. المنبّه يعمل حتى لو أُغلق التطبيق.',
    stopsToGo: 'محطات حتى نوقظك',
    stopsToGoOne: 'محطة واحدة حتى نوقظك',
    almostThere: 'سنوقظك بعد لحظات',
    distanceLeft: 'المسافة المتبقية',
    wakeRange: 'مدى التنبيه',
    destination: 'الوجهة',
    nextStop: 'المحطة التالية',
    waitingFix: 'جارٍ تحديد موقعك…',
    cancel: 'إلغاء المنبّه',
    cancelConfirmTitle: 'إلغاء المنبّه؟',
    cancelConfirmBody: 'لن نوقظك عند وجهتك.',
    cancelConfirmYes: 'نعم، ألغِ',

    noSignal: 'لا توجد إشارة',
    noSignalBody: 'آخر مسافة عرفناها: {distance}. ما زلنا نحاول.',
    noSignalNotification: 'لا توجد إشارة. آخر مسافة: {distance}',

    statusActive: 'المنبّه مفعّل',
    notificationTitle: 'سنوقظك عند {destination}',
    notificationTitleLive: '{distance} إلى {destination}',
    notificationBody: 'يمكنك قفل الهاتف.',
    serviceTitle: 'وصلنا؟ نتابع رحلتك',
    serviceBody: 'تحديث الموقع يعمل في الخلفية لنوقظك في الوقت المناسب.',

    killedTitle: 'النظام أوقف المنبّه',
    killedBody: 'أغلق أندرويد التطبيق في الخلفية أثناء رحلتك السابقة. يمكن منع ذلك من إعدادات البطارية.',
    killedAction: 'كيف نصلح ذلك',
  },

  alarm: {
    title: 'وصلت.',
    body: '{destination} هنا تماماً.',
    dismiss: 'أنا مستيقظ',
    wakeAgain: 'أيقظني مرة أخرى عند المحطة نفسها',
    wakeAgainDone: 'سنوقظك مرة أخرى',
    channelGroup: 'منبّهات الوصول',
    notificationTitle: 'وصلت إلى {destination}',
    notificationBody: 'حان وقت النزول.',

    overshotTitle: 'تجاوزت محطتك',
    overshotBody: 'المسافة تزداد. تحقق من مكانك.',
    overshotScreenTitle: 'تجاوزتها.',
    overshotScreenBody: 'بدأت تبتعد عن {destination} قبل أن يتمكن المنبّه من العمل.',

    staleTitle: 'فقدنا الإشارة',
    staleBody: 'ربما تكون قد وصلت. آخر مسافة عرفناها كانت {distance}.',
    staleScreenTitle: 'ربما تكون قد وصلت.',
    staleScreenBody: 'فقدنا الإشارة قرب {destination}، لذا نوقظك احتياطاً.',

    earlyTitle: 'تقترب من {destination}',
    earlyBody: 'بقي {distance}. يمكنك البدء بالاستعداد.',
  },

  permissions: {
    title: 'شيئان، حتى نتمكن من إيقاظك',
    intro: 'بدون أي منهما لا توجد طريقة لمعرفة متى وصلت.',

    locationTitle: 'الموقع',
    locationBody: 'نتحقق من بُعدك عن وجهتك. يبقى الموقع على جهازك ولا يُرسل إلى أي مكان.',
    locationAction: 'السماح بالوصول إلى الموقع',

    backgroundTitle: 'الموقع في الخلفية',
    backgroundBody: 'هذا ما يتيح لنا إيقاظك والشاشة مطفأة والهاتف في جيبك. بدونه يمكننا إيقاظك فقط عندما يكون التطبيق مفتوحاً.',
    backgroundAction: 'السماح في الخلفية',
    backgroundWhy: 'لماذا هذا ضروري',

    notificationsTitle: 'الإشعارات',
    notificationsBody: 'المنبّه نفسه. بدونها يمكننا إصدار صوت فقط عندما يكون التطبيق مفتوحاً.',
    notificationsAction: 'السماح بالإشعارات',

    blockedTitle: 'الإذن محظور',
    blockedBody: 'فعّل الإذن من إعدادات جهازك حتى نتمكن من إيقاظك.',
    granted: 'مسموح',
    stepOf: 'الخطوة {current} من {total}',
  },

  demo: {
    title: 'هكذا سيبدو الصوت',
    body: 'قبل أن تثق بنا لإيقاظك، يستحق الأمر أن تسمع مرة واحدة ما يحدث عند الوصول.',
    play: 'استمع إلى الصوت',
    skip: 'لا حاجة',
    sample: 'محطة تجريبية',
  },

  saved: {
    title: 'وجهات محفوظة',
    add: 'حفظ الوجهة',
    addTitle: 'حفظ هذه الوجهة',
    addPrompt: 'ماذا نسمّيها؟',
    remove: 'حذف',
    removeHint: 'اضغط مطوّلاً للخيارات.',
    removeConfirm: 'حذف «{name}»؟',
    pin: 'تثبيت في المقدمة',
    unpin: 'إلغاء التثبيت',
    pinned: 'مثبّت',
    home: 'البيت',
    work: 'العمل',
    station: 'محطة',
    favourite: 'مفضّل',
    savedConfirm: 'تم الحفظ',
  },

  settings: {
    title: 'الإعدادات',

    sectionAlarm: 'المنبّه',
    sectionApp: 'التطبيق',
    sectionPrivacy: 'الخصوصية',
    sectionHelp: 'مساعدة',

    sound: {
      label: 'الصوت',
      soft: 'هادئ',
      normal: 'عادي',
      sharp: 'حاد',
      softNote: 'يبدأ خافتاً ويعلو. يوقظك دون أن يوقظ الصف كله.',
      normalNote: 'جرس متصاعد. واضح أنه منبّه، ويبقى لطيفاً.',
      sharpNote: 'صفير منبّه. لمن ينام نوماً عميقاً حقاً.',
      preview: 'استماع',
    },

    vibrate: 'اهتزاز',
    vibrateNote: 'يعمل حتى عندما يكون الهاتف صامتاً.',

    volume: 'مستوى الصوت',
    volumeNote: 'هذا مستوى مشغّلنا، وليس مستوى الجهاز. لا يستطيع أي تطبيق تغيير مستوى صوت النظام.',

    defaultRadius: 'المدى الافتراضي',
    defaultRadiusNote: 'المدى المحدد مسبقاً في كل رحلة جديدة.',

    language: 'اللغة',
    languageRestartNote: 'التبديل بين لغة تُقرأ من اليمين إلى اليسار وأخرى من اليسار إلى اليمين يتطلب إعادة تشغيل التطبيق حتى ينعكس التخطيط.',

    theme: 'المظهر',
    themeSystem: 'حسب النظام',
    themeLight: 'فاتح',
    themeDark: 'داكن',

    demo: 'تشغيل العرض التجريبي',
    demoNote: 'يشغّل الصوت الذي اخترته ويعرض شاشة الوصول.',

    crashReports: 'تقارير الأعطال',
    crashReportsNote: 'تساعد في إصلاح الأعطال التي تمنع عمل المنبّه. بدون موقع، بدون معرّف، بدون تتبّع استخدام.',

    privacyTitle: 'ما الذي يغادر جهازك',
    privacyBody: 'يبقى موقعك على الهاتف ولا يُرسل إلى أي خادم. الاستثناء الوحيد: عند اختيار وجهة، تُرسل إحداثيتان إلى OpenStreetMap لجلب المحطات على الطريق. مرة واحدة، بدون معرّف. منذ لحظة تفعيل المنبّه لا يتصل التطبيق بالشبكة إطلاقاً.',

    whyNotWork: 'لماذا لم يعمل المنبّه؟',
    whyNotWorkBody: 'يحتفظ نظاما التشغيل بحق تأخير أحداث الخلفية لتوفير البطارية، وأندرويد يغلق تطبيقات الخلفية أيضاً. نستخدم ثلاث طبقات للكشف لتقليص ذلك، لكن لا يمكن لأي تطبيق أن يضمن مئة بالمئة.',
    batteryTitle: 'توفير البطارية في أندرويد',
    batteryBody: 'شركات مثل شاومي وسامسونغ وأوبو تغلق تطبيقات الخلفية بقوة. استثناء التطبيق من توفير البطارية هو الحل الوحيد الفعّال حقاً.',
    batteryAction: 'فتح إعدادات البطارية',

    version: 'الإصدار {version}',
  },

  debug: {
    title: 'تصحيح',
    subtitle: 'نسخ التطوير فقط.',
    geofence: 'السياج الجغرافي مسجّل',
    backgroundTask: 'مهمة الخلفية تعمل',
    lastFix: 'آخر تحديد موقع',
    lastFixAge: 'قبل {seconds} ثانية',
    never: 'أبداً',
    tier: 'مستوى أخذ العينات',
    accuracy: 'الدقة',
    session: 'الجلسة',
    forceArrival: 'فرض الوصول',
    forceOvershoot: 'فرض التجاوز',
    forceStale: 'فرض فقدان الإشارة',
    forceEarly: 'فرض التنبيه المبكر',
    clearSession: 'مسح الجلسة',
  },

  errors: {
    locationUnavailable: 'لم نتمكن من تحديد موقعك. تأكد من تشغيل GPS.',
    searchFailed: 'فشل البحث. تحقق من الاتصال.',
    armFailed: 'لم نتمكن من تفعيل المنبّه. حاول مرة أخرى.',
    unknownPlace: 'وجهتك',
  },

  warnings: {
    foregroundOnly: 'بدون إذن الموقع في الخلفية يمكننا إيقاظك فقط عندما يكون التطبيق مفتوحاً.',
    batteryOptimisation: 'قد يوقف أندرويد تطبيقات الخلفية. إذا لم يعمل المنبّه، أوقف توفير البطارية لهذا التطبيق.',
  },
};
