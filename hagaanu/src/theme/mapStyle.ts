import type { Scheme } from './colors';

/**
 * Google Maps style, derived from the active scheme.
 *
 * The map here is context, not content: it sits above the rail as a band, and
 * its job is to tell you roughly where you are without pulling the eye off the
 * stop list. So commercial POIs are off entirely, road labels are off, roads
 * collapse to two weights, and transit is the one feature promoted above the
 * base. The result is quiet enough that the accent green on the rail and the
 * live dot are the only saturated things in the frame.
 *
 * Applied on Android. Apple Maps ignores custom styles and follows its own
 * light/dark appearance, which we set via `userInterfaceStyle` instead.
 */
export function mapStyleFor(scheme: Scheme) {
  const m = scheme.map;
  return [
    { elementType: 'geometry', stylers: [{ color: m.ground }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: m.label }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: m.labelHalo }] },

    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

    // Nothing commercial. Someone picking a stop does not need restaurants.
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: m.block }] },

    { featureType: 'road', elementType: 'geometry', stylers: [{ color: m.street }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: m.arterial }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: m.arterial }] },

    // Transit is the subject, so it is the one thing drawn above the base.
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: m.transit }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: m.transit }] },
    { featureType: 'transit.station', elementType: 'labels', stylers: [{ visibility: 'off' }] },

    { featureType: 'water', elementType: 'geometry', stylers: [{ color: m.water }] },
    { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ];
}
