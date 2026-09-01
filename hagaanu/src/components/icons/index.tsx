import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { colors } from '../../theme';

/**
 * The drawn icon set.
 *
 * Every mark in the app is here. Nothing is an emoji and nothing comes from an
 * icon font: emoji render as someone else's artwork in someone else's style and
 * were previously doing the emotional work the design should do, while a font
 * shipped 4 MB to use six glyphs.
 *
 * Two classes, and the distinction is what keeps the set coherent:
 *
 * INTERFACE ICONS — search, close, plus, locate, and the saved-list marks. A
 * 24×24 grid, stroke `S` (1.9) without exception, round caps and joins. An
 * earlier pass had these drifting across 1.9 / 2 / 2.2 / 2.4, which is exactly
 * the mismatched-stroke tell: at 20px the difference reads as sloppiness rather
 * than emphasis.
 *
 * BRAND MARKS — Crescent, StationNode, BrandGlyph, SignalBurst. These are
 * artwork, not iconography: they carry their own grids (76, 30, 168) and their
 * own weights, scaled proportionally, and they recur from the launcher icon
 * down to a 9px status dot.
 */

type IconProps = {
  size?: number;
  color?: string;
};

/** The interface-icon stroke. Every 24-grid icon uses this and nothing else. */
const S = 1.9;

export function SearchIcon({ size = 20, color = colors.rail }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth={S} />
      <Path d="M16 16l4 4" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = colors.paperMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = colors.signal }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

/** Crosshair — "centre the map on me". */
export function LocateIcon({ size = 22, color = colors.paper }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={S} />
      <Path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke={color}
        strokeWidth={S}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * The interchange marker of a transit diagram. Used for the destination
 * everywhere it appears — on the map, in the sheet, in the saved list — so the
 * same object always looks like the same object.
 */
export function StationNode({ size = 22, color = colors.signal }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={S} />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

/**
 * The brand mark: a crescent cradling a station node — night, and a place to
 * be woken at. Drawn on a 76 grid because it originates as the app icon.
 */
export function Crescent({
  size = 76,
  color = colors.signal,
  nodeColor = colors.paper,
  showNode = true,
}: IconProps & { nodeColor?: string; showNode?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76" fill="none">
      <Path d="M52 14a26 26 0 1 0 0 48 31 31 0 0 1 0-48Z" fill={color} />
      {showNode ? (
        <>
          <Circle cx="52" cy="38" r="9.5" stroke={nodeColor} strokeWidth={2.5} />
          <Circle cx="52" cy="38" r="3.25" fill={nodeColor} />
        </>
      ) : null}
    </Svg>
  );
}

/** The app's lockup glyph: the node, reversed out of a solid signal square. */
export function BrandGlyph({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Rect width="30" height="30" fill={colors.signal} />
      <Circle cx="15" cy="15" r="8.75" stroke={colors.ink} strokeWidth={3} fill="none" />
      <Circle cx="15" cy="15" r="3" fill={colors.ink} />
    </Svg>
  );
}

/** Concentric rings radiating from a node — the alarm, in the map's own language. */
export function SignalBurst({ size = 168, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 168 168" fill="none">
      <Circle cx="84" cy="84" r="16" fill={color} />
      <Circle cx="84" cy="84" r="34" stroke={color} strokeWidth={5} strokeOpacity={0.72} />
      <Circle cx="84" cy="84" r="54" stroke={color} strokeWidth={4} strokeOpacity={0.42} />
      <Circle cx="84" cy="84" r="76" stroke={color} strokeWidth={3} strokeOpacity={0.2} />
    </Svg>
  );
}

/* ---------- saved-destination marks ---------- */

export function HomeIcon({ size = 24, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.8Z" stroke={color} strokeWidth={S} strokeLinejoin="round" />
      <Path d="M9.5 20v-6h5v6" stroke={color} strokeWidth={S} strokeLinejoin="round" />
    </Svg>
  );
}

export function WorkIcon({ size = 24, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="7.5" width="17" height="12.5" rx="1.5" stroke={color} strokeWidth={S} />
      <Path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" stroke={color} strokeWidth={S} strokeLinecap="round" />
      <Path d="M3.5 12.5h17" stroke={color} strokeWidth={S} />
    </Svg>
  );
}

export function TrainIcon({ size = 24, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3.5" width="14" height="13.5" rx="2.5" stroke={color} strokeWidth={S} />
      <Path d="M5 10.5h14" stroke={color} strokeWidth={S} />
      <Path d="M8.5 17 6 20.5M15.5 17l2.5 3.5" stroke={color} strokeWidth={S} strokeLinecap="round" />
      <Circle cx="9" cy="14" r="1.1" fill={color} />
      <Circle cx="15" cy="14" r="1.1" fill={color} />
    </Svg>
  );
}

export function StarIcon({ size = 24, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 4 2.45 5.2 5.55.8-4 4.05.95 5.75L12 17.1 7.05 19.8 8 14.05l-4-4.05 5.55-.8L12 4Z"
        stroke={color}
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({ size = 24, color = colors.paper }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 15.5V10a6 6 0 0 0-12 0v5.5L4.5 18h15L18 15.5Z"
        stroke={color}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Path d="M10 18a2 2 0 0 0 4 0" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * A printed barcode, drawn rather than photographed so it scales and recolours.
 * Bar widths are a fixed sequence — a real ticket's code does not reshuffle
 * every render, and a stable pattern is what makes it read as printed.
 */
const BARS: [number, number][] = [
  [0, 3], [5, 1], [9, 2], [14, 4], [21, 1], [25, 3], [31, 1], [35, 2],
  [40, 4], [47, 2], [52, 1], [56, 3], [62, 2], [67, 1], [71, 4], [78, 1],
  [82, 2], [87, 3], [93, 1], [97, 2], [102, 4], [109, 1], [113, 3], [119, 2],
  [124, 1], [128, 4], [135, 2], [140, 1], [144, 3], [150, 1], [154, 2],
  [159, 4], [166, 1], [170, 3],
];

export function Barcode({
  width = 176,
  height = 38,
  color = colors.ink,
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 176 38">
      <G fill={color}>
        {BARS.map(([x, w]) => (
          <Rect key={x} x={x} y={0} width={w} height={38} />
        ))}
      </G>
    </Svg>
  );
}
