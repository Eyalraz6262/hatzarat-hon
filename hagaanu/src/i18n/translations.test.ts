/**
 * The four translation files, as a contract.
 *
 * Run with: npm test
 *
 * Every one of these failures has a user-visible shape. A missing key renders
 * the raw dot-path — `errors.armFailed` — on someone's screen. A placeholder
 * that got dropped in translation renders a sentence with a hole where the
 * distance should be. Neither shows up in a typecheck, because these are data
 * files, and neither shows up in review, because nobody proofreads four files
 * side by side.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { isRTLLanguage, setLanguage, t } from './index';
import { ar } from './translations/ar';
import { en } from './translations/en';
import { he } from './translations/he';
import { ru } from './translations/ru';

type Tree = { [key: string]: string | Tree };

const OTHERS: [string, Tree][] = [
  ['en', en as Tree],
  ['ar', ar as Tree],
  ['ru', ru as Tree],
];

/** Every leaf, as a dot-path. */
function paths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : paths(value, path);
  });
}

function at(tree: Tree, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>(
    (node, part) => (node as Tree | undefined)?.[part],
    tree
  );
  return typeof value === 'string' ? value : undefined;
}

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const HEBREW = paths(he as Tree);

test('Hebrew is a non-trivial source, so the checks below mean something', () => {
  assert.ok(HEBREW.length > 150, `expected the source to have real content, got ${HEBREW.length}`);
});

for (const [name, tree] of OTHERS) {
  test(`${name} has every key Hebrew has`, () => {
    const missing = HEBREW.filter((path) => at(tree, path) === undefined);
    assert.deepEqual(missing, [], `${name} is missing keys — these would render as raw dot-paths`);
  });

  test(`${name} has no key Hebrew does not`, () => {
    // A leftover key is dead weight, and usually the trace of a rename that
    // only landed in one file.
    const extra = paths(tree).filter((path) => at(he as Tree, path) === undefined);
    assert.deepEqual(extra, [], `${name} has keys the source does not`);
  });

  test(`${name} keeps every placeholder`, () => {
    const broken = HEBREW.filter((path) => {
      const source = at(he as Tree, path);
      const target = at(tree, path);
      if (source === undefined || target === undefined) return false;
      return placeholders(source).join() !== placeholders(target).join();
    });
    assert.deepEqual(broken, [], `${name} changed the placeholders — these render with holes`);
  });

  test(`${name} has nothing blank`, () => {
    const blank = paths(tree).filter((path) => (at(tree, path) ?? '').trim() === '');
    assert.deepEqual(blank, [], `${name} has empty strings`);
  });
}

test('no translation has leaked characters from another script', () => {
  // A real one that got shipped and caught by eye: a stray CJK character in the
  // middle of a Russian string. Nothing about the app would have complained.
  const CJK = /[　-〿㐀-䶿一-鿿]/;
  const offenders: string[] = [];

  for (const [name, tree] of [['he', he as Tree], ...OTHERS] as [string, Tree][]) {
    for (const path of paths(tree)) {
      const value = at(tree, path) ?? '';
      if (CJK.test(value)) offenders.push(`${name}.${path}: ${value}`);
    }
  }

  assert.deepEqual(offenders, []);
});

test('Hebrew and Arabic are right-to-left, English and Russian are not', () => {
  // This decides which way every screen lays out, since `row()` and `align()`
  // read it directly. Getting it wrong mirrors the entire app.
  assert.equal(isRTLLanguage('he'), true);
  assert.equal(isRTLLanguage('ar'), true);
  assert.equal(isRTLLanguage('en'), false);
  assert.equal(isRTLLanguage('ru'), false);
});

test('t() interpolates, and falls back to the source rather than to the key', () => {
  setLanguage('he');
  assert.equal(t('approach.window', { distance: '5 ק״מ' }), 'התצוגה: 5 ק״מ האחרונים');

  // The failure this guards against is a user seeing "approach.window" on
  // their screen because one file was behind.
  setLanguage('ru');
  assert.ok(!t('approach.window', { distance: '5 km' }).includes('approach.'));
  setLanguage('he');
});
