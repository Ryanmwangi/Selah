import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUNDLED_ID, DEFAULT_ID, formatBytes, getTranslation, TRANSLATIONS,
  translationAbbrev, translationFileName,
} from '../src/lib/scripture/translations';

test('registry has exactly one bundled version, and it is public domain', () => {
  const bundled = TRANSLATIONS.filter((tr) => tr.bundled);
  assert.equal(bundled.length, 1);
  assert.equal(bundled[0].id, BUNDLED_ID);
  assert.ok(bundled[0].distributable, 'bundled version must be distributable');
});

test('default preference and bundled fallback both exist', () => {
  assert.ok(getTranslation(DEFAULT_ID), 'DEFAULT_ID missing from registry');
  assert.ok(getTranslation(BUNDLED_ID), 'BUNDLED_ID missing from registry');
});

test('launch registry is public-domain / freely licensed only', () => {
  // no copyrighted, non-distributable version ships at launch
  for (const tr of TRANSLATIONS) {
    assert.equal(tr.distributable, true, `${tr.id} is not distributable`);
    if (!tr.distributable) assert.equal(tr.bundled, false, `${tr.id} is bundled but not distributable`);
  }
});

test('default preference is the bundled, license-free version', () => {
  assert.equal(DEFAULT_ID, BUNDLED_ID);
});

test('file name is derived and stable', () => {
  assert.equal(translationFileName('WEB'), 'bible-web.db');
  assert.equal(translationFileName('KJV'), 'bible-kjv.db');
});

test('abbrev lookup falls back to the id', () => {
  assert.equal(translationAbbrev('KJV'), 'KJV');
  assert.equal(translationAbbrev('ZZZ'), 'ZZZ');
});

test('formatBytes is human readable', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(4_505_600), '4.3 MB');
});
