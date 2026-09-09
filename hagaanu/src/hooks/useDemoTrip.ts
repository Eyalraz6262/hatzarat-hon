/**
 * The browser demo's simulated journey. A no-op on a real device.
 *
 * The web build overrides this file with `useDemoTrip.web.ts`. Metro resolves
 * the platform variant first, so a phone never carries any of it.
 */
export function useDemoTrip(): void {}

/** True only in the browser demo, where the platform layers are stood in for. */
export const IS_DEMO = false;
