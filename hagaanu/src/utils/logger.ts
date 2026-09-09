/**
 * Tiny leveled logger.
 *
 * Background tasks run in a JS context detached from the dev menu, so every
 * line is prefixed with its scope — that prefix is how you find geofence events
 * in `adb logcat` / the Xcode console when the phone was in a pocket.
 */
/**
 * `__DEV__` is injected by Metro and does not exist in a bare Node context,
 * where the unit tests import modules that reach this file. Reading it through
 * globalThis keeps the logger loadable everywhere; under Metro the value is
 * identical.
 */
const enabled = (globalThis as { __DEV__?: boolean }).__DEV__ ?? false;

type Scope =
  | 'geofence'
  | 'location'
  | 'alarm'
  | 'notify'
  | 'permissions'
  | 'store'
  | 'stops'
  | 'app';

function emit(level: 'log' | 'warn' | 'error', scope: Scope, message: string, extra?: unknown) {
  if (!enabled && level === 'log') return;
  const line = `[hagaanu:${scope}] ${message}`;
  if (extra === undefined) console[level](line);
  else console[level](line, extra);
}

export const log = {
  debug: (scope: Scope, message: string, extra?: unknown) => emit('log', scope, message, extra),
  warn: (scope: Scope, message: string, extra?: unknown) => emit('warn', scope, message, extra),
  error: (scope: Scope, message: string, extra?: unknown) => emit('error', scope, message, extra),
};
