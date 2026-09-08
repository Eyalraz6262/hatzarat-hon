/**
 * Turning what someone typed, and what the operator wrote, into the same words.
 *
 * Lives apart from ./match because the national stop index needs exactly these
 * rules and match imports that index — one of the two had to move, and it was
 * always going to be the half with no dependencies of its own.
 */

/** Hebrew points and cantillation, plus the marks people type inconsistently. */
const MARKS = /[\u0591-\u05c7\u05f3\u05f4'"`]/g;
const SEPARATORS = /[-\u2013\u2014_,.()[\]/\\]+/g;

export function normalize(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(SEPARATORS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The definite article is optional in the way people type.
 *
 * "מפרץ" should find "המפרץ" and the other way round, but stripping ה from
 * every word would turn "הרצליה" into "רצליה" and "הדסה" into "דסה". Three
 * letters left over is the shortest that is still a word worth matching.
 */
export function withoutArticle(token: string): string | null {
  return token.startsWith('\u05d4') && token.length >= 4 ? token.slice(1) : null;
}

export function tokensOf(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * What being near something is worth, in the same units as a matched word.
 *
 * Both halves of the search score against this so their results can be sorted
 * into one list. It is deliberately strong: "הרצל" is a street in a hundred
 * towns and every one of them has stops on it, and the user is standing in
 * exactly one of them. It still tops out below a whole extra matched word, so
 * naming the town you mean always beats standing somewhere else.
 */
export function proximityScore(distanceM: number | null): number {
  if (distanceM === null) return 0;
  return 280 / (1 + distanceM / 8_000);
}
