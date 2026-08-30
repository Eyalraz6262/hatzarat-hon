/**
 * Google Maps JSON style matching the app's night palette.
 * Applied on Android (and on iOS only if the Google provider is opted into).
 * Apple Maps ignores this and follows the system appearance instead.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#12172a' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa4c4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1020' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a3355' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7f89ab' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#16281f' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1d2540' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a2c0' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#232c4c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3760' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#25304f' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#b9c3e0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1226' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0a1226' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5578' }] },
];
