const test = require('node:test');
const assert = require('node:assert/strict');
const { createGlobalHotkeyMatcher, normalizeNativeKeyName } = require('../src/main/global-hotkeys');

test('normalizes native key names for ordinary key chords', () => {
  assert.equal(normalizeNativeKeyName('INSERT'), 'Insert');
  assert.equal(normalizeNativeKeyName('1'), '1');
  assert.equal(normalizeNativeKeyName('LEFT CTRL'), 'CommandOrControl');
});

test('matches ordinary key chords such as Insert+1', () => {
  const matches = [];
  const matcher = createGlobalHotkeyMatcher((accelerator) => matches.push(accelerator));
  matcher.setSlots([{ id: 'a', name: 'test', accelerator: 'Insert+1', durationSeconds: 60, enabled: true }]);

  matcher.handleEvent({ name: 'INSERT', state: 'DOWN' });
  matcher.handleEvent({ name: '1', state: 'DOWN' });

  assert.deepEqual(matches, ['Insert+1']);
});

test('does not repeat a held chord until a key is released', () => {
  const matches = [];
  const matcher = createGlobalHotkeyMatcher((accelerator) => matches.push(accelerator));
  matcher.setSlots([{ id: 'a', name: 'test', accelerator: 'Insert+1', durationSeconds: 60, enabled: true }]);

  matcher.handleEvent({ name: 'INSERT', state: 'DOWN' });
  matcher.handleEvent({ name: '1', state: 'DOWN' });
  matcher.handleEvent({ name: '1', state: 'DOWN' });
  matcher.handleEvent({ name: '1', state: 'UP' });
  matcher.handleEvent({ name: '1', state: 'DOWN' });

  assert.deepEqual(matches, ['Insert+1', 'Insert+1']);
});
