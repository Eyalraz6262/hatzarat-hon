import type { TranslationSchema } from './he';

/**
 * Russian.
 *
 * NEEDS A NATIVE REVIEW BEFORE RELEASE. This is a careful first pass, not a
 * professional translation, and it is marked as such in the spec.
 *
 * One thing a reviewer should look at specifically: `stopsToGo` is a plural
 * form, and Russian has three of them (1 остановка / 2-4 остановки /
 * 5+ остановок). The schema only has a singular and a plural slot because
 * Hebrew needs two, so the plural here is written to work with the 2-4 form
 * and reads slightly off for 5 and above. Fixing it properly means adding a
 * `stopsToGoMany` key to the schema and a plural rule per language — worth
 * doing, and deliberately not faked here.
 *
 * Place names stay in whatever form the map returns them, usually Hebrew or
 * English. That is deliberate: a passenger matching a sign on a platform
 * needs the string that is on the sign.
 */
export const ru: TranslationSchema = {
  brand: {
    name: 'Мы приехали?',
    slogan: 'Спите. Мы вас разбудим.',
  },

  common: {
    cancel: 'Отмена',
    close: 'Закрыть',
    confirm: 'Подтвердить',
    continue: 'Продолжить',
    notNow: 'Не сейчас',
    openSettings: 'Открыть настройки',
    retry: 'Ещё раз',
    save: 'Сохранить',
    done: 'Готово',
    back: 'Назад',
    on: 'Вкл.',
    off: 'Выкл.',
    meters: '{value} м',
    kilometers: '{value} км',
  },

  home: {
    searchPlaceholder: 'Куда едете?',
    searching: 'Ищем…',
    noResults: 'Ничего не нашлось. Попробуйте название станции или улицы.',
    myLocation: 'Моё местоположение',
    clearSearch: 'Очистить',
    settings: 'Настройки',
    emptyTitle: 'Куда едете сегодня?',
    emptyBody: 'Выберите пункт назначения, и мы разбудим вас заранее.',
  },

  route: {
    changeDestination: 'Изменить пункт назначения',
    wakeRange: 'Когда разбудить?',
    arm: 'Разбудите меня',
    arming: 'Включаем…',
    saveDestination: 'Сохранить пункт назначения',
    earlyWarning: 'Ещё и раннее предупреждение',
    earlyWarningNote: 'Тихое уведомление за {distance}, и полный будильник на выбранном расстоянии.',
    addStop: 'Добавить остановку по пути',
    addStopHint: 'Если по пути пересадка — добавьте место. Разбудим и там.',
    distanceNote: 'До места сейчас {distance}.',
    removeStop: 'Убрать остановку',
  },

  approach: {
    sleep: 'Можно спать',
    toGo: 'до места',
    toTransfer: 'до пересадки',
    window: 'Показаны последние {distance}',
    wakeBand: 'Здесь разбудим · {distance}',
    closing: 'Подъезжаем',
    almost: 'Разбудим с минуты на минуту',
    then: 'Затем',
    preview: 'Разбудим за {distance} до места.',
  },

  active: {
    body: 'Можно заблокировать телефон. Будильник работает и с закрытым приложением.',
    distanceLeft: 'Осталось',
    wakeRange: 'Радиус оповещения',
    destination: 'Пункт назначения',
    waitingFix: 'Определяем ваше местоположение…',
    cancel: 'Отменить будильник',
    cancelConfirmTitle: 'Отменить будильник?',
    cancelConfirmBody: 'Мы не разбудим вас на месте.',
    cancelConfirmYes: 'Да, отменить',

    noSignal: 'Нет сигнала',
    noSignalBody: 'Последнее известное расстояние: {distance}. Продолжаем попытки.',
    noSignalNotification: 'Нет сигнала. Последнее расстояние: {distance}',


    statusActive: 'Будильник включён',
    notificationTitle: 'Разбудим вас на «{destination}»',
    notificationTitleLive: '{distance} до «{destination}»',
    notificationBody: 'Можно заблокировать телефон.',
    serviceTitle: 'Мы приехали? — следим за поездкой',
    serviceBody: 'Определение местоположения работает в фоне, чтобы разбудить вас вовремя.',

    killedTitle: 'Система остановила будильник',
    killedBody: 'Android закрыл приложение в фоне во время прошлой поездки. Это можно предотвратить в настройках батареи.',
    killedAction: 'Как это исправить',
  },

  alarm: {
    title: 'Вы на месте.',
    body: '«{destination}» прямо здесь.',
    dismiss: 'Я не сплю',
    wakeAgain: 'Разбудить ещё раз на самой остановке',
    wakeAgainDone: 'Разбудим ещё раз',
    channelGroup: 'Будильники прибытия',
    notificationTitle: 'Вы прибыли на «{destination}»',
    notificationBody: 'Пора выходить.',

    overshotTitle: 'Вы проехали остановку',
    overshotBody: 'Расстояние растёт. Проверьте, где вы находитесь.',
    overshotScreenTitle: 'Вы проехали.',
    overshotScreenBody: 'Вы начали удаляться от «{destination}» раньше, чем будильник успел сработать.',

    staleTitle: 'Мы потеряли сигнал',
    staleBody: 'Возможно, вы уже приехали. Последнее известное расстояние: {distance}.',
    staleScreenTitle: 'Возможно, вы приехали.',
    staleScreenBody: 'Мы потеряли сигнал рядом с «{destination}», поэтому будим на всякий случай.',

    earlyTitle: 'Приближаетесь к «{destination}»',
    earlyBody: 'Осталось {distance}. Можно собираться.',
  },

  permissions: {
    title: 'Две вещи, чтобы мы могли вас разбудить',
    intro: 'Без любой из них невозможно понять, когда вы приехали.',

    locationTitle: 'Местоположение',
    locationBody: 'Мы проверяем, насколько вы далеко от цели. Данные остаются на устройстве и никуда не отправляются.',
    locationAction: 'Разрешить доступ к местоположению',

    backgroundTitle: 'Местоположение в фоне',
    backgroundBody: 'Именно это позволяет разбудить вас с выключенным экраном и телефоном в кармане. Без этого мы разбудим только при открытом приложении.',
    backgroundAction: 'Разрешить в фоне',
    backgroundWhy: 'Зачем это нужно',

    notificationsTitle: 'Уведомления',
    notificationsBody: 'Сам будильник. Без них звук возможен только при открытом приложении.',
    notificationsAction: 'Разрешить уведомления',

    blockedTitle: 'Разрешение заблокировано',
    blockedBody: 'Включите разрешение в настройках устройства, чтобы мы могли вас разбудить.',
    granted: 'Разрешено',
    stepOf: 'Шаг {current} из {total}',
  },

  demo: {
    title: 'Вот как это звучит',
    body: 'Прежде чем доверить нам своё пробуждение, стоит один раз услышать, что происходит при прибытии.',
    play: 'Послушать',
    skip: 'Не нужно',
    sample: 'Пробная остановка',
  },

  saved: {
    title: 'Сохранённые места',
    add: 'Сохранить место',
    addTitle: 'Сохранить это место',
    addPrompt: 'Как его назвать?',
    remove: 'Удалить',
    removeHint: 'Долгое нажатие — параметры.',
    pin: 'Закрепить в начале',
    unpin: 'Открепить',
    pinned: 'Закреплено',
    home: 'Дом',
    work: 'Работа',
    station: 'Станция',
    favourite: 'Избранное',
    savedConfirm: 'Сохранено',
  },

  settings: {
    title: 'Настройки',

    sectionAlarm: 'Будильник',
    sectionApp: 'Приложение',
    sectionPrivacy: 'Конфиденциальность',
    sectionHelp: 'Помощь',

    sound: {
      label: 'Звук',
      soft: 'Мягкий',
      normal: 'Обычный',
      sharp: 'Резкий',
      softNote: 'Начинается тихо и нарастает. Разбудит вас, а не весь ряд.',
      normalNote: 'Нарастающий колокол. Понятно, что будильник, и при этом приятно.',
      sharpNote: 'Писк будильника. Для тех, кто действительно крепко спит.',
      preview: 'Прослушать',
    },

    vibrate: 'Вибрация',
    vibrateNote: 'Работает и в беззвучном режиме.',

    volume: 'Громкость',
    volumeNote: 'Это громкость нашего плеера, а не устройства. Приложение не может менять системную громкость.',

    defaultRadius: 'Радиус по умолчанию',
    defaultRadiusNote: 'Радиус, выбранный заранее для каждой новой поездки.',

    language: 'Язык',
    languageRestartNote: 'Переключение между языком справа налево и слева направо требует перезапуска приложения, чтобы разметка отзеркалилась.',

    theme: 'Оформление',
    themeSystem: 'Как в системе',
    themeLight: 'Светлое',
    themeDark: 'Тёмное',

    demo: 'Запустить демонстрацию',
    demoNote: 'Проигрывает выбранный звук и показывает экран прибытия.',

    crashReports: 'Отчёты о сбоях',
    crashReportsNote: 'Помогают исправлять сбои, из-за которых будильник не срабатывает. Без местоположения, без идентификатора, без аналитики.',

    privacyTitle: 'Что покидает устройство',
    privacyBody:
      'Ваше местоположение остаётся на телефоне и не отправляется ни на какой наш сервер. Единственное исключение — поиск адреса или нажатие на карту: текст или две координаты уходят в картографическую службу самого устройства (Apple на iOS, Google на Android), чтобы получить название места. После включения будильника приложение вообще не обращается к сети.',

    whyNotWork: 'Почему будильник не сработал?',
    whyNotWorkBody: 'Обе операционные системы оставляют за собой право задерживать фоновые события ради экономии батареи, а Android ещё и закрывает фоновые приложения. Мы используем три слоя обнаружения, чтобы сузить этот разрыв, но ни одно приложение не может обещать сто процентов.',
    batteryTitle: 'Экономия батареи в Android',
    batteryBody: 'Производители вроде Xiaomi, Samsung и Oppo агрессивно закрывают фоновые приложения. Исключение приложения из экономии батареи — единственное, что действительно помогает.',
    batteryAction: 'Открыть настройки батареи',

    version: 'Версия {version}',
  },


  errors: {
    locationUnavailable: 'Не удалось определить местоположение. Проверьте, включён ли GPS.',
    searchFailed: 'Поиск не удался. Проверьте соединение.',
    armFailed: 'Не удалось включить будильник. Попробуйте ещё раз.',
    unknownPlace: 'Ваш пункт назначения',
  },

  warnings: {
    foregroundOnly: 'Без разрешения на фоновое местоположение мы разбудим вас только при открытом приложении.',
    batteryOptimisation: 'Android может останавливать фоновые приложения. Если будильник не сработал, отключите экономию батареи для этого приложения.',
  },

  web: {
    mapHint: 'Нажмите на карту, чтобы выбрать место',
    banner: 'Демо в браузере',
    bannerBody: 'Браузер не может зарегистрировать геозону в ОС и не разбудит закрытую вкладку. Здесь можно включить будильник и увидеть все экраны — сама поездка смоделирована.',
    simulate: 'Запустить поездку',
    simulating: 'Едем…',
    simulateNote: 'Довезёт вас за ~40 секунд, чтобы увидеть, как меняется экран и срабатывает будильник.',
    reset: 'Начать заново',
  },
};
