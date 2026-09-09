import BellRing from 'lucide-react-native/icons/bell-ring';
import MapPin from 'lucide-react-native/icons/map-pin';
import Moon from 'lucide-react-native/icons/moon';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton, Txt, row } from '../components/ui';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion, space, useTheme } from '../theme';

/**
 * Three screens, once.
 *
 * The catalog's warning about three-slide onboarding is about three slides that
 * say nothing — an illustration, a headline, and a dot, three times. These three
 * are the product's argument in order: here is the problem you have, here is the
 * one thing you do, here is what happens then. Cut any of them and the app has
 * to explain itself later, when the person is already trying to use it.
 *
 * It never appears again, and it can be skipped from the first screen.
 */
const STEPS = [
  { Icon: Moon, title: 'onboarding.oneTitle', body: 'onboarding.oneBody' },
  { Icon: MapPin, title: 'onboarding.twoTitle', body: 'onboarding.twoBody' },
  { Icon: BellRing, title: 'onboarding.threeTitle', body: 'onboarding.threeBody' },
] as const;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const s = useTheme();
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;

  const { Icon, title, body } = STEPS[step];
  const last = step === STEPS.length - 1;

  const go = (next: number) => {
    Feedback.tick();
    if (reduced) {
      setStep(next);
      return;
    }
    // A cross-fade rather than a slide: the steps are an argument, not a
    // carousel, and a slide invites a swipe back to something already read.
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: motion.state, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(next), 120);
  };

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.head, { flexDirection: row() }]}>
          <View style={styles.grow} />
          {!last ? <GhostButton label={t('onboarding.skip')} onPress={onDone} /> : null}
        </View>

        <Animated.View style={[styles.body, { opacity: fade }]}>
          <View style={[styles.mark, { backgroundColor: s.primary.soft }]}>
            <Icon size={38} strokeWidth={1.9} color={s.primary.text} />
          </View>
          <Txt variant="display" style={styles.title}>
            {t(title)}
          </Txt>
          <Txt variant="body" tone="muted" style={styles.title}>
            {t(body)}
          </Txt>
        </Animated.View>

        <View style={styles.foot}>
          <View style={[styles.dots, { flexDirection: row() }]}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === step ? s.primary.base : s.lineStrong,
                    width: i === step ? 22 : 7,
                  },
                ]}
              />
            ))}
          </View>

          <PrimaryButton
            label={last ? t('onboarding.start') : t('common.continue')}
            onPress={() => (last ? onDone() : go(step + 1))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  head: {
    minHeight: 48,
    alignItems: 'center',
    paddingHorizontal: space.screen,
  },
  grow: { flexGrow: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xxxl,
  },
  mark: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  title: { textAlign: 'center' },
  foot: {
    paddingHorizontal: space.screen,
    paddingBottom: space.lg,
    gap: space.xl,
  },
  dots: {
    justifyContent: 'center',
    gap: space.sm,
  },
  dot: { height: 7, borderRadius: 999 },
});
