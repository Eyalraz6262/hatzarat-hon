import { ALARM_SOUND_SPECS, isAlarmSoundId, DEFAULT_SOUND_ID, type AlarmSoundId } from './catalog';

/**
 * The bundled audio for each tone.
 *
 * This is the only file that touches the asset modules. `require()` at module
 * scope is what lets Metro find and bundle the files at build time, and it is
 * also what makes this file unloadable outside a bundler — which is exactly
 * why the catalog lives next door.
 */

// Static requires, resolved at build time. Not a loop or a map: Metro reads
// these literally and a computed path would resolve to nothing.
const MODULES: Record<AlarmSoundId, number> = {
  soft: require('../../../assets/sounds/alarm-soft.wav'),
  normal: require('../../../assets/sounds/alarm-normal.wav'),
  sharp: require('../../../assets/sounds/alarm-sharp.wav'),
};

export function moduleFor(id: unknown): number {
  return MODULES[isAlarmSoundId(id) ? id : DEFAULT_SOUND_ID];
}

export function soundFor(id: unknown) {
  const spec = ALARM_SOUND_SPECS[isAlarmSoundId(id) ? id : DEFAULT_SOUND_ID];
  return { ...spec, module: MODULES[spec.id] };
}

export { ALARM_SOUND_IDS, ALARM_SOUND_SPECS, DEFAULT_SOUND_ID, RAMP_MS, specFor, isAlarmSoundId } from './catalog';
export type { AlarmSoundId, AlarmSoundSpec } from './catalog';
