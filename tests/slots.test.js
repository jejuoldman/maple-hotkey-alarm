const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSlot, validateSlots } = require('../src/shared/slots');

test('normalizes a slot with duration and enabled default', () => {
  const slot = normalizeSlot({ name: '재획', accelerator: 'CommandOrControl+Alt+S', durationSeconds: 300 });

  assert.equal(slot.name, '재획');
  assert.equal(slot.durationSeconds, 300);
  assert.equal(slot.enabled, true);
  assert.ok(slot.id);
});

test('rejects zero duration', () => {
  assert.throws(() => normalizeSlot({ name: 'bad', accelerator: 'Alt+A', durationSeconds: 0 }), /duration/);
});

test('detects duplicate hotkeys among enabled slots', () => {
  const slots = [
    normalizeSlot({ id: 'a', name: 'A', accelerator: 'Alt+A', durationSeconds: 60 }),
    normalizeSlot({ id: 'b', name: 'B', accelerator: 'Alt+A', durationSeconds: 90 })
  ];

  assert.throws(() => validateSlots(slots), /Duplicate hotkey/);
});
