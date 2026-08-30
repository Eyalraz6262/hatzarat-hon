import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { ALARM_MAX_DURATION_MS, VIBRATION_PATTERN } from '../../constants/config';
import { log } from '../../utils/logger';

/**
 * The actual "wake up" — looping sound plus continuous vibration.
 *
 * This is deliberately separate from NotificationService: the notification is the
 * guaranteed delivery path (it fires even if our JS is torn down a second later),
 * while this is the loud, keeps-going-until-dismissed layer that runs whenever our
 * process is alive. Either one alone wakes most people; together they are the
 * closest a non-entitled app can get to an alarm clock.
 */

// Static require so Metro bundles the asset; the path is resolved at build time.
const ALARM_SOURCE = require('../../../assets/sounds/alarm.wav');

let player: AudioPlayer | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let ringing = false;

async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      // iOS: AVAudioSession .playback — plays even with the ringer switch on
      // silent. This is what makes the alarm audible for a sleeping passenger.
      playsInSilentMode: true,
      // Keeps playing when we get here from a background geofence wake.
      shouldPlayInBackground: true,
      // Duck nothing, interrupt everything else — this is an alarm.
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });
  } catch (error) {
    log.warn('alarm', 'failed to configure audio session', error);
  }
}

export const AlarmService = {
  isRinging(): boolean {
    return ringing;
  },

  /**
   * Starts sound + vibration. Safe to call twice (the second call is a no-op),
   * which matters because the geofence and the backstop can both decide we
   * arrived within the same second.
   */
  async start(): Promise<void> {
    if (ringing) return;
    ringing = true;

    // Vibration first: it needs no async setup and works even if audio fails.
    try {
      Vibration.vibrate([...VIBRATION_PATTERN], true);
    } catch (error) {
      log.warn('alarm', 'vibration failed', error);
    }

    try {
      await configureAudioSession();
      player = createAudioPlayer(ALARM_SOURCE);
      player.loop = true;
      player.volume = 1.0;
      player.play();
      log.debug('alarm', 'ringing');
    } catch (error) {
      log.error('alarm', 'failed to start alarm audio', error);
    }

    // Don't drain the battery of a phone whose owner already got off the train.
    stopTimer = setTimeout(() => {
      log.debug('alarm', 'auto-stopping after max duration');
      void AlarmService.stop();
    }, ALARM_MAX_DURATION_MS);
  },

  async stop(): Promise<void> {
    ringing = false;

    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }

    try {
      Vibration.cancel();
    } catch {
      // Android throws if nothing is vibrating; harmless.
    }

    if (player) {
      try {
        player.pause();
        player.remove();
      } catch (error) {
        log.warn('alarm', 'failed to release audio player', error);
      }
      player = null;
    }

    // Release the audio session so the user's music/podcast can resume.
    try {
      await setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
    } catch {
      // Non-fatal.
    }

    log.debug('alarm', 'stopped');
  },

  /**
   * A short confirmation buzz — used when the user arms the alarm, so they get
   * physical feedback before pocketing the phone.
   */
  confirmationBuzz(): void {
    try {
      Vibration.vibrate(Platform.OS === 'android' ? 40 : [0, 40]);
    } catch {
      // Ignore — feedback only.
    }
  },
};
