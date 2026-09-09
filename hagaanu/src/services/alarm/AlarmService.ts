import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { ALARM_MAX_DURATION_MS, VIBRATION_PATTERN } from '../../constants/config';
import { currentSettings } from '../../state/useSettingsStore';
import { RAMP_MS, moduleFor, specFor } from '../audio/sounds';
import { log } from '../../utils/logger';

/**
 * The actual "wake up" — looping sound plus continuous vibration.
 *
 * Deliberately separate from NotificationService. The notification is the
 * guaranteed delivery path: it fires even if our JS is torn down a second
 * later. This is the loud, keeps-going-until-dismissed layer that runs
 * whenever our process is alive. Either alone wakes most people; together
 * they are the closest a non-entitled app can get to an alarm clock.
 */

let player: AudioPlayer | null = null;
let capTimer: ReturnType<typeof setTimeout> | null = null;
let rampTimer: ReturnType<typeof setInterval> | null = null;
let ringing = false;

/** How often the soft tone's fade-in steps. 20 steps over RAMP_MS. */
const RAMP_STEPS = 20;

async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      // iOS: AVAudioSession .playback — plays even with the ringer switch on
      // silent. This is what makes the alarm audible for a sleeping passenger.
      playsInSilentMode: true,
      // Keeps playing when we get here from a background geofence wake.
      shouldPlayInBackground: true,
      // Duck nothing, interrupt everything else. This is an alarm.
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });
  } catch (error) {
    log.warn('alarm', 'failed to configure audio session', error);
  }
}

function clearTimers(): void {
  if (capTimer) {
    clearTimeout(capTimer);
    capTimer = null;
  }
  if (rampTimer) {
    clearInterval(rampTimer);
    rampTimer = null;
  }
}

function startVibration(): void {
  try {
    Vibration.vibrate([...VIBRATION_PATTERN], true);
  } catch (error) {
    log.warn('alarm', 'vibration failed', error);
  }
}

function stopVibration(): void {
  try {
    Vibration.cancel();
  } catch {
    // Android throws if nothing is vibrating. Harmless.
  }
}

async function teardownPlayer(): Promise<void> {
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch (error) {
    log.warn('alarm', 'failed to release audio player', error);
  }
  player = null;
}

export const AlarmService = {
  isRinging(): boolean {
    return ringing;
  },

  /**
   * Starts sound and vibration using the user's chosen tone.
   *
   * Safe to call twice — the second call is a no-op, which matters because the
   * geofence and the backstop can both decide we arrived within the same second.
   */
  async start(): Promise<void> {
    if (ringing) return;
    ringing = true;

    const settings = currentSettings();
    const spec = specFor(settings.soundId);

    // Vibration first: no async setup, and it works even if audio fails
    // entirely — a phone in a pocket against a leg is a real wake-up path.
    if (settings.vibrate) startVibration();

    try {
      await configureAudioSession();
      player = createAudioPlayer(moduleFor(settings.soundId));
      player.loop = true;

      if (spec.ramps) {
        // The soft tone climbs to the chosen gain over four seconds, so it can
        // wake its owner without waking the row behind them. Stepped rather
        // than eased: expo-audio has no volume animation, and at 200ms per
        // step the change is below what the ear reads as stepping.
        player.volume = settings.volume * 0.06;
        player.play();

        let step = 0;
        rampTimer = setInterval(() => {
          step += 1;
          const progress = Math.min(1, step / RAMP_STEPS);
          if (player) player.volume = settings.volume * (0.06 + 0.94 * progress);
          if (progress >= 1 && rampTimer) {
            clearInterval(rampTimer);
            rampTimer = null;
          }
        }, RAMP_MS / RAMP_STEPS);
      } else {
        player.volume = settings.volume;
        player.play();
      }

      log.debug('alarm', `ringing: ${spec.id} at ${settings.volume.toFixed(2)}`);
    } catch (error) {
      log.error('alarm', 'failed to start alarm audio', error);
      // Audio failed, so vibration becomes the only channel. Turn it on even
      // if the user had it off: a silent alarm is not a degraded alarm, it is
      // no alarm, and the notification is the only other thing left.
      if (!settings.vibrate) startVibration();
    }

    // The sound stops on its own eventually, but the vibration and the
    // notification do not — see `stopSoundOnly`. A phone ringing for an hour
    // in the pocket of someone who already got off helps nobody.
    capTimer = setTimeout(() => {
      log.debug('alarm', 'sound cap reached; vibration continues');
      void AlarmService.stopSoundOnly();
    }, ALARM_MAX_DURATION_MS);
  },

  /**
   * Silences the tone but keeps vibrating.
   *
   * Reached only by the safety cap. The alarm is still notionally ringing —
   * `isRinging()` stays true and the wake screen stays up — because the user
   * has not acknowledged anything yet. Stopping outright would quietly turn a
   * missed alarm into a dismissed one.
   */
  async stopSoundOnly(): Promise<void> {
    if (rampTimer) {
      clearInterval(rampTimer);
      rampTimer = null;
    }
    await teardownPlayer();
  },

  async stop(): Promise<void> {
    ringing = false;
    clearTimers();
    stopVibration();
    await teardownPlayer();

    // Release the audio session so the user's music or podcast can resume.
    try {
      await setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
    } catch {
      // Non-fatal.
    }

    log.debug('alarm', 'stopped');
  },

  /**
   * Plays a tone once, at the given gain, for the settings preview and the
   * first-run demo.
   *
   * Independent of the alarm path on purpose: previewing a tone must never be
   * able to leave the real alarm in a half-started state, and `ringing` is
   * deliberately untouched here.
   */
  async preview(soundId: string, volume: number): Promise<() => void> {
    const spec = specFor(soundId);
    let preview: AudioPlayer | null = null;

    try {
      await configureAudioSession();
      preview = createAudioPlayer(moduleFor(spec.id));
      preview.loop = false;
      preview.volume = volume;
      preview.play();
    } catch (error) {
      log.warn('alarm', 'preview failed', error);
    }

    return () => {
      try {
        preview?.pause();
        preview?.remove();
      } catch {
        // Already gone.
      }
    };
  },

  /**
   * A short confirmation buzz, used when the alarm is armed — physical
   * feedback before the phone goes in a pocket.
   */
  confirmationBuzz(): void {
    if (!currentSettings().vibrate) return;
    try {
      Vibration.vibrate(Platform.OS === 'android' ? 40 : [0, 40]);
    } catch {
      // Feedback only.
    }
  },
};
