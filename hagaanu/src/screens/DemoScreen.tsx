import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { AlarmScreen } from './AlarmScreen';
import { GhostButton, PrimaryButton, Txt } from '../components/ui';
import { AlarmService } from '../services/alarm/AlarmService';
import { useSettingsStore } from '../state/useSettingsStore';
import { space, useTheme } from '../theme';

/**
 * The one-time demo, shown after permissions and before the first trip.
 *
 * The argument for it: arming this app means locking your phone and trusting
 * software that has never once made a sound at you. Three seconds of hearing
 * what arrival is actually like turns that from a leap into a decision, and it
 * is the cheapest trust the app will ever buy.
 *
 * It plays the real tone through the real player and shows the real arrival
 * screen — not a mock of either. A demo that looks nothing like the thing it
 * is demonstrating teaches the wrong lesson.
 */

/** Long enough to register, short enough that nobody wants to escape it. */
const PREVIEW_MS = 3200;

export function DemoScreen({ onDone }: { onDone: () => void }) {
  const s = useTheme();
  const soundId = useSettingsStore((state) => state.soundId);
  const volume = useSettingsStore((state) => state.volume);

  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const end = useCallback(() => {
    stop.current?.();
    stop.current = null;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setPlaying(false);
    setHeard(true);
  }, []);

  // Nothing may outlive this screen: a tone still playing after the user has
  // moved on is the exact opposite of the reassurance the demo exists to give.
  useEffect(() => end, [end]);

  const play = useCallback(() => {
    setPlaying(true);
    void (async () => {
      stop.current = await AlarmService.preview(soundId, volume);
    })();
    timer.current = setTimeout(end, PREVIEW_MS);
  }, [soundId, volume, end]);

  if (playing) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {/*
          The real arrival screen, with its dismiss wired to end the demo. Using
          the actual component rather than a picture of it means the demo can
          never drift out of sync with what the alarm really looks like.
        */}
        <AlarmScreen
          destination={{ label: t('demo.sample'), coords: { latitude: 0, longitude: 0 } }}
          onDismiss={() => {
            // Dismissing the demo alarm is the whole lesson, so it also
            // finishes the demo. Letting it run to the timer instead returns
            // here with the button changed to "continue".
            end();
            onDone();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <Txt variant="display">{t('demo.title')}</Txt>
          <Txt variant="body" tone="muted" style={styles.lede}>
            {t('demo.body')}
          </Txt>
        </View>

        <View style={styles.dock}>
          {heard ? (
            <>
              <PrimaryButton label={t('common.continue')} onPress={onDone} />
              <GhostButton label={t('demo.play')} onPress={play} />
            </>
          ) : (
            <>
              <PrimaryButton label={t('demo.play')} onPress={play} />
              <GhostButton label={t('demo.skip')} onPress={onDone} />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.screen,
    gap: space.lg,
  },
  lede: { maxWidth: 340 },
  dock: {
    paddingHorizontal: space.screen,
    paddingBottom: space.md,
    gap: space.md,
  },
});
