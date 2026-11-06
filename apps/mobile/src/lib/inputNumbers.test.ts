import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInputDecimal } from './inputNumbers';
test('locale decimal input accepts dot/comma and signed coordinates', () => {
  assert.equal(parseInputDecimal('1,8'), 1.8);
  assert.equal(parseInputDecimal(' 0,5 '), 0.5);
  assert.equal(parseInputDecimal('-81,1234'), -81.1234);
  assert.equal(parseInputDecimal('−81.1234'), -81.1234);
  assert.equal(parseInputDecimal('.5'), 0.5);
  assert.equal(parseInputDecimal('1.'), 1);
});
test('unfinished and malformed input never silently becomes zero or a different number', () => {
  for (const input of [
    '',
    ' ',
    '-',
    '.',
    ',',
    '-,',
    '1,2.3',
    '1.2.3',
    '1e2',
    '0x10',
    'Infinity',
    '1 000',
  ])
    assert.ok(Number.isNaN(parseInputDecimal(input)), input);
});

test('unit display round trips preserve exact radius and equipment limits', async () => {
  const { createLengthDraft, readLengthDraft, convertLengthDraft } = await import('./inputNumbers');
  // A rounded 32.808 ft display must remain exactly the native watch's 10 m minimum.
  const minimumRadius = createLengthDraft(10, 'imperial');
  assert.equal(minimumRadius.text, '32.808');
  assert.equal(readLengthDraft(minimumRadius), 10);
  const original = createLengthDraft(89.1234567, 'metric');
  assert.equal(
    readLengthDraft(convertLengthDraft(convertLengthDraft(original, 'imperial'), 'metric')),
    89.1234567,
  );
  assert.equal(
    readLengthDraft({ ...createLengthDraft(10, 'imperial'), text: '100,5' }),
    30.632400000000004,
  );
});
test('unit changes retain incomplete drafts as invalid instead of changing them to zero', async () => {
  const { createLengthDraft, readLengthDraft, convertLengthDraft } = await import('./inputNumbers');
  for (const text of ['', '-', ',']) {
    const draft = convertLengthDraft({ ...createLengthDraft(100, 'imperial'), text }, 'metric');
    assert.equal(draft.text, text);
    assert.ok(Number.isNaN(readLengthDraft(draft)));
  }
});
