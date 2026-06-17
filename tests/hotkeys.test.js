const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAccelerator, describeAccelerator, eventToAccelerator } = require('../src/shared/hotkeys');

test('normalizes modifier order for Electron accelerators', () => {
  assert.equal(normalizeAccelerator(['s', 'Control', 'Alt']), 'CommandOrControl+Alt+S');
});

test('normalizes common key aliases', () => {
  assert.equal(normalizeAccelerator(['Escape']), 'Esc');
  assert.equal(normalizeAccelerator([' ']), 'Space');
});

test('rejects modifier-only combinations', () => {
  assert.throws(() => normalizeAccelerator(['Control', 'Alt']), /non-modifier key/);
});

test('describes accelerators in user-facing text', () => {
  assert.equal(describeAccelerator('CommandOrControl+Alt+S'), 'Ctrl + Alt + S');
});

test('converts captured keyboard event data to accelerator', () => {
  assert.equal(eventToAccelerator({ ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, key: 's' }), 'CommandOrControl+Alt+S');
});
