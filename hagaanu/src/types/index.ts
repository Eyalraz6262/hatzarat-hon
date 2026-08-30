export type LatLng = {
  latitude: number;
  longitude: number;
};

/** A place the user picked as their wake-up point. */
export type Destination = {
  coords: LatLng;
  /** Human readable label — reverse-geocoded address, search result, or a fallback. */
  label: string;
};

/** A user position sample, normalised away from the expo-location shape. */
export type PositionSample = {
  coords: LatLng;
  /** Horizontal accuracy in meters, when the OS reports one. */
  accuracy: number | null;
  timestamp: number;
};

export type AlarmStatus =
  /** Nothing armed. User is picking a destination. */
  | 'idle'
  /** Geofence + backstop are running, user can lock the phone. */
  | 'armed'
  /** We are inside the region — sound, vibration and the wake screen are on. */
  | 'ringing';

/**
 * The armed alarm, persisted to disk.
 *
 * This is the source of truth shared between the foreground UI and the background
 * task; the background task may run in a JS context that has no React state at all,
 * so it reads and writes this record directly.
 */
export type AlarmSession = {
  id: string;
  destination: Destination;
  radiusM: number;
  status: Exclude<AlarmStatus, 'idle'>;
  /** Epoch ms when the user armed the alarm. */
  armedAt: number;
  /** Epoch ms when the geofence/backstop decided we arrived. */
  triggeredAt: number | null;
  /** Which layer detected the arrival — useful for diagnostics. */
  triggeredBy: 'geofence' | 'backstop' | 'foreground' | 'manual' | null;
  /**
   * True when the user declined background location. The OS geofence and the
   * background stream are both unavailable, so the alarm can only fire while the
   * app is open — the home screen warns about this.
   */
  foregroundOnly: boolean;
  /** Id of the currently active polling tier, so we only restart on change. */
  pollingTierId: string | null;
};

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'blocked';

export type PermissionsSnapshot = {
  foregroundLocation: PermissionState;
  backgroundLocation: PermissionState;
  notifications: PermissionState;
};
