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

/**
 * Why the alarm is ringing.
 *
 *   arrived   we measured ourselves inside the ring
 *   overshot  we were approaching, and then we were not
 *   stale     the signal went quiet close to the destination
 */
export type AlarmReason = 'arrived' | 'overshot' | 'stale';

export type AlarmStatus =
  /** Nothing armed. User is picking a destination. */
  | 'idle'
  /** Geofence + backstop are running, user can lock the phone. */
  | 'armed'
  /** We are inside the region — sound, vibration and the wake screen are on. */
  | 'ringing';

/** One target on a journey: where to wake, and how close is close enough. */
export type Leg = {
  destination: Destination;
  radiusM: number;
};

/**
 * The armed alarm, persisted to disk.
 *
 * This is the source of truth shared between the foreground UI and the background
 * task; the background task may run in a JS context that has no React state at all,
 * so it reads and writes this record directly.
 */
export type AlarmSession = {
  id: string;
  /** The leg we are watching for RIGHT NOW. */
  destination: Destination;
  radiusM: number;
  /**
   * Legs still to come, in order.
   *
   * A journey with a change is one journey with two targets, not two alarms.
   * Running them in sequence rather than in parallel means one OS region at a
   * time, which is both simpler and more reliable: iOS caps monitored regions
   * per app, and two live geofences on one trip doubles every way the OS has
   * to disappoint us. When a leg fires and the user dismisses it, the next one
   * arms automatically.
   */
  remaining: Leg[];
  status: Exclude<AlarmStatus, 'idle'>;
  /** Epoch ms when the user armed the alarm. */
  armedAt: number;
  /** Epoch ms when the geofence/backstop decided we arrived. */
  triggeredAt: number | null;
  /** Which layer detected it — useful for diagnostics. */
  triggeredBy: 'geofence' | 'backstop' | 'foreground' | 'watchdog' | 'manual' | null;
  /**
   * WHY the alarm fired, which is a different question from which layer noticed.
   *
   * The wake screen says something different for each, because "you are here"
   * and "you went past" and "we lost signal near your stop" call for three
   * different reactions from someone who just opened their eyes.
   */
  reason: AlarmReason | null;
  /**
   * True when the user declined background location. The OS geofence and the
   * background stream are both unavailable, so the alarm can only fire while the
   * app is open — the home screen warns about this.
   */
  foregroundOnly: boolean;
  /** Id of the currently active polling tier, so we only restart on change. */
  pollingTierId: string | null;

  /**
   * The optional early heads-up: a silent notification further out, so the
   * passenger can start getting their things together. Null when not wanted.
   */
  earlyRadiusM: number | null;
  earlySent: boolean;

  /**
   * The closest we have ever measured on this trip.
   *
   * A low-water mark, not a running distance. The overshoot rule hangs off it:
   * without it there is no way to tell "the bus is going the long way round"
   * from "we went past". See services/alarm/watchdog.ts.
   */
  closestM: number | null;
  lastDistanceM: number | null;
  /** Epoch ms of the most recent fix, for the stale-signal rules. */
  lastFixAt: number | null;
  /** Ground speed at the last fix, m/s, when the OS reported one. */
  lastSpeedMps: number | null;
  /**
   * True once we have told the user the signal went stale, so the lock screen
   * is not rewritten with the same text on every silent tick.
   */
  staleNoticed: boolean;
  /**
   * The distance last written into the ongoing notification. Kept so the
   * background task re-posts only when the visible text actually changes —
   * re-posting on every fix would be a wake-up per fix for no benefit.
   */
  statusDistanceLabel?: string | null;
  /**
   * The stop list the rail was built from, frozen at arm time.
   *
   * Persisted with the session rather than refetched, for two reasons. The
   * armed alarm must never need the network, and a passenger who closes the
   * app on a train and reopens it twenty minutes later would otherwise see an
   * empty rail exactly when it matters most.
   *
   * Optional because a session written before this field existed is still a
   * valid session, and an armed alarm must survive an app update.
   */
  stops?: TransitStopRecord[];
  /** Why `stops` is empty, when it is. Shown on the rail. */
  stopsFallback?: 'offline' | 'none-found' | 'too-far' | null;
};

/**
 * A transit stop as stored on disk.
 *
 * Structurally identical to `TransitStop`, and declared here rather than
 * imported so `types` stays free of service dependencies.
 */
export type TransitStopRecord = {
  id: string;
  name: string;
  coords: LatLng;
  kind: 'rail' | 'bus' | 'light-rail';
  fromOriginM: number;
};

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'blocked';

export type PermissionsSnapshot = {
  foregroundLocation: PermissionState;
  backgroundLocation: PermissionState;
  notifications: PermissionState;
};
