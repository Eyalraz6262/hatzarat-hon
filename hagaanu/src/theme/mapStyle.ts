/**
 * Google Maps style for the "כרטיס נסיעה" system.
 *
 * The map is pushed most of the way to a transit diagram: business POIs and
 * local road labels are switched off entirely, roads collapse to two weights,
 * and rail is the only feature promoted above the base. What survives is line
 * work in ink and rail grey — so the destination's signal-orange zone is the
 * only saturated thing on the screen, which is the whole point.
 *
 * Applied on Android. Apple Maps ignores it and follows its own dark mode.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#14161C' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14161C' }] },

  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2A2E3A' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },

  // Nothing commercial. A passenger picking a stop does not need restaurants.
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181E22' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1F28' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#232735' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A2E3A' }] },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6B7280' }, { visibility: 'on' }],
  },

  // Rail is the subject, so it is the one thing drawn above the base.
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#3D4351' }] },
  { featureType: 'transit.station.rail', elementType: 'geometry', stylers: [{ color: '#6B7280' }] },
  {
    featureType: 'transit.station.rail',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9AA1AE' }],
  },
  { featureType: 'transit.station.bus', stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#101219' }] },
  { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
