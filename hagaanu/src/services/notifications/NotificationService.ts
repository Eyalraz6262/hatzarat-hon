import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications';

import {
  CHANNELS,
  CHANNEL_GROUP,
  CHANNEL_VIBRATION_PATTERN,
  alarmChannelFor,
} from '../../constants/config';
import { ALARM_SOUND_IDS, specFor } from '../audio/catalog';
import { currentSettings } from '../../state/useSettingsStore';
import { formatDistance } from '../../utils/geo';
import type { AlarmReason } from '../../types';

/**
 * What the wake-up notification says.
 *
 * Three reasons, three messages. "You are here", "you went past" and "we lost
 * signal near your stop" call for three different reactions from someone who
 * has just opened their eyes, and collapsing them into one line would make the
 * app confidently wrong two times out of three.
 */
function alarmText(
  destination: string,
  reason: AlarmReason,
  distance: number | null
): { title: string; body: string } {
  if (reason === 'overshot') {
    return { title: t('alarm.overshotTitle'), body: t('alarm.overshotBody') };
  }
  if (reason === 'stale') {
    return {
      title: t('alarm.staleTitle'),
      body: t('alarm.staleBody', {
        distance: distance === null ? '' : formatDistance(distance),
      }),
    };
  }
  return {
    title: t('alarm.notificationTitle', { destination }),
    body: t('alarm.notificationBody'),
  };
}
import { t } from '../../i18n';
import { light } from '../../theme';
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
      // One group, so the system settings screen shows the three tones
      // together rather than as three unrelated channels.
      await Notifications.setNotificationChannelGroupAsync(CHANNEL_GROUP, {
        name: t('alarm.channelGroup'),
      });

      // One channel per tone. Android caches a channel's sound at creation and
      // will not change it afterwards, so this is the only way a user can
      // actually pick their alarm sound. See constants/config.ts.
      for (const id of ALARM_SOUND_IDS) {
        await Notifications.setNotificationChannelAsync(alarmChannelFor(id), {
          name: t(`settings.sound.${id}`),
          groupId: CHANNEL_GROUP,
          // MAX importance produces a heads-up notification even on the lock
          // screen, and USAGE_ALARM routes the sound to the *alarm* volume
          // stream, which stays audible when the phone is on vibrate.
          importance: AndroidImportance.MAX,
          sound: specFor(id).file,
          vibrationPattern: [...CHANNEL_VIBRATION_PATTERN],
          enableVibrate: true,
          enableLights: true,
          lightColor: light.accent.base,
          // Ring through Do Not Disturb. The user still has to grant DND
          // access; when they have not, Android silently ignores this rather
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
      }

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
  async presentAlarm(
    destinationLabel: string,
    reason: AlarmReason = 'arrived',
    context: { distance?: number | null } = {}
  ): Promise<void> {
    await NotificationService.configure();
    const spec = specFor(currentSettings().soundId);
    const text = alarmText(destinationLabel, reason, context.distance ?? null);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: text.title,
          body: text.body,
          sound: spec.file,
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
        trigger: Platform.OS === 'android' ? { channelId: alarmChannelFor(spec.id) } : null,
      });
      log.debug('notify', `alarm notification presented on ${spec.id}`);
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
    distanceLabel?: string | null,
    /**
     * When the fix has gone stale, the lock screen stops showing a live
     * distance and says so instead. Continuing to display the last number as
     * if it were current is the app quietly lying to a sleeping passenger.
     */
    stale = false
  ): Promise<void> {
    await NotificationService.configure();
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: STATUS_NOTIFICATION_ID,
        content: {
          title: stale
            ? t('active.noSignalNotification', { distance: distanceLabel ?? '' })
            : distanceLabel
              ? t('active.notificationTitleLive', {
                  distance: distanceLabel,
                  destination: destinationLabel,
                })
              : t('active.notificationTitle', { destination: destinationLabel }),
          body: t('active.notificationBody'),
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

  /**
   * The silent early heads-up.
   *
   * Posted on the STATUS channel on purpose: it is deliberately quiet, and
   * putting it on an alarm channel would make "start getting your things
   * together" as loud as "get off now".
   */
  async presentEarly(destinationLabel: string, distanceM: number): Promise<void> {
    await NotificationService.configure();
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('alarm.earlyTitle', { destination: destinationLabel }),
          body: t('alarm.earlyBody', { distance: formatDistance(distanceM) }),
          sound: false,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          interruptionLevel: 'active',
          data: { kind: NOTIFICATION_KIND.STATUS },
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNELS.STATUS } : null,
      });
      log.debug('notify', 'early heads-up presented');
    } catch (error) {
      log.warn('notify', 'failed to present early notification', error);
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
