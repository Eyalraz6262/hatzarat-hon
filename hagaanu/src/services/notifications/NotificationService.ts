import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications';

import {
  ALARM_SOUND_FILE,
  CHANNELS,
  CHANNEL_VIBRATION_PATTERN,
} from '../../constants/config';
import { t } from '../../i18n';
import { colors } from '../../theme';
import { log } from '../../utils/logger';

/** Marks our own notifications so listeners can tell them apart. */
export const NOTIFICATION_KIND = {
  ALARM: 'alarm',
  STATUS: 'status',
} as const;

export type NotificationKind = (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

/** Stable id so re-arming replaces the status notification instead of stacking. */
const STATUS_NOTIFICATION_ID = 'hagaanu-status-notification';

let channelsReady = false;

export const NotificationService = {
  /**
   * Must run before any notification is posted — including from a background
   * task, which is why it is called from the task itself and not only at boot.
   */
  async configure(): Promise<void> {
    if (channelsReady) return;

    if (Platform.OS === 'android') {
      // The alarm channel is the whole reason the app can wake a sleeping user:
      // MAX importance produces a heads-up notification even on the lock screen,
      // and USAGE_ALARM routes the sound to the *alarm* volume stream, which
      // stays audible when the phone is on vibrate.
      await Notifications.setNotificationChannelAsync(CHANNELS.ALARM, {
        name: t('alarm.title'),
        importance: AndroidImportance.MAX,
        sound: ALARM_SOUND_FILE,
        vibrationPattern: [...CHANNEL_VIBRATION_PATTERN],
        enableVibrate: true,
        enableLights: true,
        lightColor: colors.signal,
        // Ring through Do Not Disturb. The user still has to grant the DND
        // access; when they haven't, Android silently ignores this flag rather
        // than failing, so it costs nothing to ask for.
        bypassDnd: true,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        audioAttributes: {
          usage: AndroidAudioUsage.ALARM,
          contentType: AndroidAudioContentType.SONIFICATION,
          flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
        },
      });

      await Notifications.setNotificationChannelAsync(CHANNELS.STATUS, {
        name: t('active.statusActive'),
        importance: AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      });
    }

    channelsReady = true;
    log.debug('notify', 'channels configured');
  },

  /**
   * Fires the wake-up notification. This is the one delivery path that works
   * even if our JS process is killed right after the geofence event, so it is
   * always sent first — sound and vibration are layered on top afterwards.
   */
  async presentAlarm(destinationLabel: string): Promise<void> {
    await NotificationService.configure();
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('alarm.notificationTitle'),
          body: t('alarm.notificationBody', { destination: destinationLabel }),
          sound: ALARM_SOUND_FILE,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [...CHANNEL_VIBRATION_PATTERN],
          sticky: true,
          autoDismiss: false,
          // iOS: presents immediately, lights the screen and breaks through
          // scheduled-summary/Focus grouping without a Critical Alert entitlement.
          interruptionLevel: 'timeSensitive',
          data: { kind: NOTIFICATION_KIND.ALARM },
        },
        // Presents immediately, but ON the alarm channel. `trigger: null` would
        // fall back to Android's default channel — losing MAX importance, the
        // alarm audio stream and the Do Not Disturb bypass, which is the entire
        // reason the channel exists.
        trigger: Platform.OS === 'android' ? { channelId: CHANNELS.ALARM } : null,
      });
      log.debug('notify', 'alarm notification presented');
    } catch (error) {
      log.error('notify', 'failed to present alarm notification', error);
    }
  },

  /**
   * The ongoing "we're watching your trip" notification.
   *
   * Re-posting with the same identifier replaces it in place, which is how the
   * distance stays live on the lock screen: someone who half-wakes and glances
   * at their phone sees "2.3 ק״מ" without unlocking anything. Callers are
   * responsible for only calling this when the text has actually changed.
   */
  async presentArmedStatus(
    destinationLabel: string,
    radiusLabel: string,
    distanceLabel?: string | null
  ): Promise<void> {
    await NotificationService.configure();
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: STATUS_NOTIFICATION_ID,
        content: {
          title: distanceLabel
            ? t('active.notificationTitleLive', { distance: distanceLabel })
            : t('active.notificationTitle'),
          body: t('active.notificationBody', { radius: radiusLabel, destination: destinationLabel }),
          sound: false,
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
          interruptionLevel: 'passive',
          data: { kind: NOTIFICATION_KIND.STATUS },
        },
        // The silent, low-importance channel. Without this the live distance
        // updates would ping the user roughly every 50 m for the whole trip.
        trigger: Platform.OS === 'android' ? { channelId: CHANNELS.STATUS } : null,
      });
    } catch (error) {
      log.warn('notify', 'failed to present status notification', error);
    }
  },

  async dismissStatus(): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(STATUS_NOTIFICATION_ID);
    } catch {
      // Not present — nothing to do.
    }
  },

  async dismissAll(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      log.warn('notify', 'failed to dismiss notifications', error);
    }
  },
};

/**
 * Foreground presentation policy.
 *
 * Registered at module scope (imported from `index.ts`) so it is installed
 * before React renders and before any background task can deliver.
 */
export function installNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const kind = notification.request.content.data?.kind as NotificationKind | undefined;
      const isAlarm = kind === NOTIFICATION_KIND.ALARM;
      return {
        shouldShowBanner: isAlarm,
        shouldShowList: true,
        // The in-app AlarmService owns the looping sound when we're in the
        // foreground; letting the notification play too would double up.
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
}
