import Trash from 'lucide-react-native/icons/trash';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, GhostButton, Touch, Txt, row } from '../components/ui';
import { MAX_ACCURACY_MARGIN_M } from '../constants/config';
import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import {
  STALE_RING_MS,
  STALE_WARN_MS,
  overshootMargin,
  overshootProximity,
} from '../services/alarm/watchdog';
import { Journal, ago, stamp, type JournalEntry } from '../services/debug/Journal';
import { GeofencingService } from '../services/geofencing/GeofencingService';
import { LocationService } from '../services/location/LocationService';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { hitSlop, icon, radius, space, useTheme } from '../theme';
import type { AlarmSession } from '../types';

/**
 * What the alarm is actually doing, on the device, right now.
 *
 * Development builds only — mounted behind a `__DEV__` check, so the whole
 * screen is dropped from a release bundle. That is why it is the one screen in
 * the app with no translations: its audience is whoever is holding the phone
 * with a checklist, and a debug label that has been through four translators
 * is a debug label nobody trusts.
 *
 * It answers the three questions a failed transit alarm always raises, in the
 * order they get asked:
 *
 *   Is anything running?      the monitors, and whether the OS still has them
 *   When did we last hear?    the age of the newest fix, against the thresholds
 *   What happened while I     the journal, which is the only record that
 *   wasn't looking?           survives the process being killed
 *
 * The force buttons drive each detection layer independently. That matters
 * because "the alarm didn't go off" has at least five different causes, and
 * being able to fire the geofence path without firing the backstop path is
 * what separates them.
 */

type Live = {
  session: AlarmSession | null;
  geofence: boolean;
  stream: boolean;
  entries: JournalEntry[];
  at: number;
};

const REFRESH_MS = 2_000;

export function DebugScreen({ onClose }: { onClose: () => void }) {
  const s = useTheme();
  const [live, setLive] = useState<Live | null>(null);
  const [acted, setActed] = useState<string | null>(null);

  const position = useAlarmStore((state) => state.position);
  const storeStatus = useAlarmStore((state) => state.status);
  const stale = useAlarmStore((state) => state.stale);
  const permissions = usePermissionsStore((state) => state.snapshot);

  const refresh = useCallback(async () => {
    const [session, geofence, stream, entries] = await Promise.all([
      AlarmStorage.read(),
      GeofencingService.isActive(),
      LocationService.isBackgroundTrackingActive(),
      Journal.read(),
    ]);
    setLive({ session, geofence, stream, entries, at: Date.now() });
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Every force button runs a real path rather than faking its result, then
  // re-reads. A button that only set some UI state would prove nothing.
  const force = useCallback(
    (label: string, run: () => Promise<unknown>) => () => {
      setActed(label);
      void (async () => {
        try {
          await run();
        } finally {
          await refresh();
        }
      })();
    },
    [refresh]
  );

  const session = live?.session ?? null;
  const fixAge = session?.lastFixAt ? (live?.at ?? Date.now()) - session.lastFixAt : null;

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { flexDirection: row() }]}>
          <Txt variant="title" style={styles.headerTitle}>
            Debug
          </Txt>
          <Touch
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={hitSlop}
            onPress={onClose}
            style={[styles.close, { backgroundColor: s.sunk }]}
          >
            <X size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
          </Touch>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* ── what is running ───────────────────────────────────── */}
          <Section title="Monitors">
            <Card padded={false}>
              <Line
                first
                label="OS geofence"
                value={live?.geofence ? 'registered' : 'not registered'}
                bad={session?.status === 'armed' && !session.foregroundOnly && !live?.geofence}
              />
              <Line
                label="Background stream"
                value={live?.stream ? 'running' : 'stopped'}
                bad={session?.status === 'armed' && !session.foregroundOnly && !live?.stream}
              />
              <Line
                label="Mode"
                value={session?.foregroundOnly ? 'FOREGROUND ONLY' : 'background'}
                bad={session?.foregroundOnly === true}
              />
              <Line label="Store status" value={storeStatus} />
              <Line label="Session status" value={session?.status ?? 'no session'} />
            </Card>
            <Note>
              A registered geofence is the only layer that survives our process being
              killed. If it says “not registered” while armed, nothing will wake a
              terminated app — that is the failure, whatever else is green.
            </Note>
          </Section>

          {/* ── when did we last hear ─────────────────────────────── */}
          <Section title="Last fix">
            <Card padded={false}>
              <Line
                first
                label="Age"
                value={fixAge === null ? 'no fix yet' : ago(fixAge)}
                bad={fixAge !== null && fixAge > STALE_WARN_MS}
              />
              <Line
                label="Distance"
                value={session?.lastDistanceM == null ? '—' : `${Math.round(session.lastDistanceM)} m`}
              />
              <Line
                label="Closest so far"
                value={session?.closestM == null ? '—' : `${Math.round(session.closestM)} m`}
              />
              <Line
                label="Speed"
                value={session?.lastSpeedMps == null ? '—' : `${session.lastSpeedMps.toFixed(1)} m/s`}
              />
              <Line label="Polling tier" value={session?.pollingTierId ?? '—'} />
              <Line label="Stale (UI)" value={stale ? 'yes' : 'no'} bad={stale} />
              <Line
                label="Foreground fix"
                value={
                  position
                    ? `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
                    : 'none'
                }
              />
            </Card>
            <Note>
              Warn at {Math.round(STALE_WARN_MS / 1000)}s, ring at{' '}
              {Math.round(STALE_RING_MS / 1000)}s. Accuracy is trusted up to{' '}
              {MAX_ACCURACY_MARGIN_M} m and ignored beyond it.
            </Note>
          </Section>

          {/* ── the trip ──────────────────────────────────────────── */}
          <Section title="Trip">
            <Card padded={false}>
              <Line first label="Destination" value={session?.destination.label ?? '—'} />
              <Line label="Radius" value={session ? `${session.radiusM} m` : '—'} />
              <Line
                label="Legs remaining"
                value={
                  session?.remaining?.length
                    ? session.remaining.map((leg) => leg.destination.label).join(' → ')
                    : 'none'
                }
              />
              <Line
                label="Early ring"
                value={session?.earlyRadiusM ? `${session.earlyRadiusM} m` : 'off'}
              />
              <Line label="Early sent" value={session?.earlySent ? 'yes' : 'no'} />
              <Line
                label="Overshoot trips at"
                value={
                  session
                    ? `+${overshootMargin(session.radiusM)} m, within ${overshootProximity(
                        session.radiusM
                      )} m`
                    : '—'
                }
              />
              <Line label="Triggered by" value={session?.triggeredBy ?? '—'} />
              <Line label="Reason" value={session?.reason ?? '—'} />
            </Card>
          </Section>

          {/* ── permissions ───────────────────────────────────────── */}
          <Section title="Permissions">
            <Card padded={false}>
              <Line
                first
                label="Location (foreground)"
                value={permissions.foregroundLocation}
                bad={permissions.foregroundLocation !== 'granted'}
              />
              <Line
                label="Location (always)"
                value={permissions.backgroundLocation}
                bad={permissions.backgroundLocation !== 'granted'}
              />
              <Line
                label="Notifications"
                value={permissions.notifications}
                bad={permissions.notifications !== 'granted'}
              />
              <Line label="Platform" value={`${Platform.OS} ${String(Platform.Version)}`} />
            </Card>
          </Section>

          {/* ── force a layer ─────────────────────────────────────── */}
          <Section title="Force a layer">
            <View style={styles.buttons}>
              <GhostButton
                label="Geofence path"
                onPress={force('geofence', () => ArrivalCoordinator.trigger('geofence', 'arrived'))}
              />
              <GhostButton
                label="Backstop path"
                onPress={force('backstop', () => ArrivalCoordinator.trigger('backstop', 'arrived'))}
              />
              <GhostButton
                label="Overshoot alarm"
                onPress={force('overshoot', () =>
                  ArrivalCoordinator.trigger('backstop', 'overshot')
                )}
              />
              <GhostButton
                label="Signal-loss alarm"
                onPress={force('stale', () => ArrivalCoordinator.trigger('watchdog', 'stale'))}
              />
              <GhostButton
                label="Early heads-up"
                onPress={force('early', () => ArrivalCoordinator.sendEarly())}
              />
              <GhostButton
                label="Advance a leg"
                onPress={force('leg', () => ArrivalCoordinator.advanceLeg(position?.coords ?? null))}
              />
            </View>
            <Note>
              Each button runs the real path, so the alarm really rings and the session
              really changes. {acted ? `Last forced: ${acted}.` : ''}
            </Note>
          </Section>

          {/* ── the journal ───────────────────────────────────────── */}
          <Section title={`Journal (${live?.entries.length ?? 0})`}>
            <Card padded={false}>
              {live?.entries.length ? (
                live.entries.map((entry, index) => (
                  <View
                    key={`${entry.at}-${index}`}
                    style={[
                      styles.entry,
                      {
                        flexDirection: row(),
                        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: s.line,
                      },
                    ]}
                  >
                    <Txt variant="caption" tone="muted" nums style={styles.entryTime}>
                      {stamp(entry.at)}
                    </Txt>
                    <View style={styles.entryBody}>
                      <Txt variant="captionStrong" tone="accent">
                        {entry.kind}
                      </Txt>
                      <Txt variant="caption" tone="muted">
                        {entry.text}
                      </Txt>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.entry}>
                  <Txt variant="caption" tone="muted">
                    Nothing recorded yet. Arm an alarm and the lines start here.
                  </Txt>
                </View>
              )}
            </Card>

            <Touch
              accessibilityRole="button"
              accessibilityLabel="Clear journal"
              onPress={force('clear', () => Journal.clear())}
              style={[styles.clear, { borderColor: s.line, flexDirection: row() }]}
            >
              <Trash size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} />
              <Txt variant="captionStrong" tone="muted">
                Clear journal
              </Txt>
            </Touch>

            <Note>
              Written from whichever JS context is alive at the time, including the
              headless one the OS spins up for a geofence event. That is what makes it
              readable after a kill — a console line from that context goes nowhere.
            </Note>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="captionStrong" tone="muted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Txt>
      {children}
    </View>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Txt variant="caption" tone="muted" style={styles.note}>
      {children}
    </Txt>
  );
}

/**
 * One measured value.
 *
 * `bad` colours the value rather than adding an icon: on a screen that is
 * mostly a wall of pairs, colour is the only thing that survives a glance.
 */
function Line({
  label,
  value,
  first,
  bad,
}: {
  label: string;
  value: string;
  first?: boolean;
  bad?: boolean;
}) {
  const s = useTheme();
  return (
    <View
      style={[
        styles.line,
        {
          flexDirection: row(),
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: s.line,
        },
      ]}
    >
      <Txt variant="caption" tone="muted" style={styles.lineLabel}>
        {label}
      </Txt>
      <Txt
        variant="captionStrong"
        tone={bad ? 'danger' : 'ink'}
        nums
        numberOfLines={2}
        style={styles.lineValue}
      >
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerTitle: { flexShrink: 1, flexGrow: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: space.screen,
    paddingBottom: space.huge,
    gap: space.xxxl,
  },
  section: { gap: space.md },
  sectionTitle: { paddingHorizontal: space.xs, letterSpacing: 0.6 },
  note: { paddingHorizontal: space.xs },

  line: {
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  lineLabel: { flexGrow: 1, flexShrink: 1 },
  lineValue: { flexShrink: 1, textAlign: 'right' },

  buttons: { gap: space.sm },

  entry: {
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  entryTime: { width: 62 },
  entryBody: { flexShrink: 1, flexGrow: 1, gap: 1 },

  clear: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
  },
});
