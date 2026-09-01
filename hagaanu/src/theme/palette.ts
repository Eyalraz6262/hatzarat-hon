/**
 * The raw materials.
 *
 * Components NEVER import from here. This file names pigments; `schemes.ts`
 * assigns them to roles, and that indirection is what makes a second colour
 * scheme possible at all — the earlier system named its tokens after the
 * material (`ink`, `paper`, `rail`), which meant every component hard-coded a
 * material and no scheme could ever swap one.
 */
export const palette = {
  /* ---- night: the unlit carriage ---- */
  ink: '#14161C',
  inkRaised: '#1C1F28',
  inkDeep: '#101219',
  inkLine: '#2A2E3A',
  inkLineStrong: '#3D4351',
  rail: '#78808E',
  railLight: '#9AA1AE',
  /** Non-text only — hairlines and ticks on ink. */
  railFaint: '#6B7280',

  /* ---- paper: everything the passenger holds ---- */
  paper: '#F2EDE4',
  paperBright: '#FBF8F1',
  paperWatermark: '#E6DFD1',
  paperShade: '#E4DDD0',
  paperRule: '#E0D9CB',
  paperPerf: '#C9C1B2',
  /**
   * Text greys, solved rather than picked. Each clears WCAG AA (4.5:1) on its
   * own ground with hue and saturation held from the original value — the fix
   * is the same colour at a different lightness, not a different colour.
   * The shipped set failed: paperMuted measured 2.27:1 on paper.
   */
  paperMuted: '#746B5B',
  paperSub: '#666C7A',
  /** Non-text only — perforations, rules, watermarks. Contrast rules do not apply. */
  paperFaint: '#A79E8E',

  /* ---- day: the lit platform. A warmer, heavier stock than the ticket, so a
         ticket still reads as a separate object lying on it. ---- */
  counter: '#DED7C9',
  counterRaised: '#CFC7B6',
  counterLine: '#C3BAA8',
  counterInk: '#5E5648',
  /** On the counter ground specifically — the ticket's muted is too light there. */
  counterMuted: '#645D55',

  /* ---- the one accent, in both schemes ---- */
  signal: '#FF6B1A',
  signalDeep: '#E05A0F',
  signalSoft: 'rgba(255,107,26,0.10)',
  /**
   * The accent AS TEXT on a paper ground. #FF6B1A measures 2.44:1 there and is
   * genuinely hard to read; this is the same hue at full saturation, darkened
   * until it clears AA. Fills, rules and shapes keep `signal` — the rule is
   * about text.
   */
  signalOnPaper: '#BE4300',

  /* ---- map, night ---- */
  mapGroundNight: '#14161C',
  mapWaterNight: '#101219',
  mapBlockNight: '#1C1F28',
  mapStreetNight: '#232735',
  mapArterialNight: '#2A2E3A',

  /* ---- map, day ---- */
  mapGroundDay: '#EDE7DA',
  mapWaterDay: '#D8D0C0',
  mapBlockDay: '#E5DFD2',
  mapStreetDay: '#D9D1C1',
  mapArterialDay: '#CAC1AF',

  transparent: 'transparent',
} as const;
