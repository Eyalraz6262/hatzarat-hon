import type { Scheme } from './schemes';

/**
 * Google Maps style, derived from the active scheme.
 *
 * The map is pushed most of the way to a transit diagram in both schemes:
 * business POIs and local road labels off entirely, roads collapsed to two
 * weights, rail the only feature promoted above the base. What survives is
 * line work — so the destination's signal-orange zone is the only saturated
 * thing on screen, which is the whole point and holds in day as well as night.
 *
 * Applied on Android. Apple Maps ignores it and follows its own appearance.
 */
export function mapStyleFor(scheme: Scheme) {
  const m = scheme.map;
  return [
    { elementType: 'geometry', stylers: [{ color: m.ground }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: m.label }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: m.ground }] },

    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: m.arterial }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

    // Nothing commercial. A passenger picking a stop does not need restaurants.
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: m.block }] },

    { featureType: 'road', elementType: 'geometry', stylers: [{ color: m.street }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: m.arterial }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: m.arterial }] },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: m.label }, { visibility: 'on' }],
    },

    // Rail is the subject, so it is the one thing drawn above the base.
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: m.stationMinor }] },
    { featureType: 'transit.station.rail', elementType: 'geometry', stylers: [{ color: m.rail }] },
    {
      featureType: 'transit.station.rail',
      elementType: 'labels.text.fill',
      stylers: [{ color: m.station }],
    },
    { featureType: 'transit.station.bus', stylers: [{ visibility: 'off' }] },

    { featureType: 'water', elementType: 'geometry', stylers: [{ color: m.water }] },
    { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ];
}
