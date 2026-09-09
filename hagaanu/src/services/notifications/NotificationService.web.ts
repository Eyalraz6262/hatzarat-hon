import type { AlarmReason } from '../../types';
import { log } from '../../utils/logger';

/**
 * Notifications, in a browser: not used.
 *
 * The Web Notifications API exists, but it is not the same mechanism in any
 * way that matters here. It cannot post an ongoing notification that updates
 * a live distance on a lock screen, it cannot carry a custom alarm sound on
 * its own channel, it cannot break through a focus mode, and it dies with the
 * tab. Standing in a real notification's place with something that weak would
 * misrepresent the part of the app that does the actual waking.
 *
 * So on web the alarm is the SCREEN and the SOUND, both of which are real and
 * both of which the demo shows. The notification layer is simply absent, and
 * the demo says so rather than faking it.
 */
export const NotificationService = {
  async configure(): Promise<void> {},
  async presentAlarm(destinationLabel: string, reason: AlarmReason = 'arrived'): Promise<void> {
    log.debug('notify', `web demo: no notification (${reason} at ${destinationLabel})`);
  },
  async presentArmedStatus(): Promise<void> {},
  async presentEarly(): Promise<void> {},
  async dismissStatus(): Promise<void> {},
  async dismissAll(): Promise<void> {},
};

export function installNotificationHandler(): void {}
