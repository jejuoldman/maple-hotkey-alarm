const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../src/main/store');

test('saves and loads slots', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maple-alarm-'));
  const store = createStore(dir);
  const slots = [{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 120, enabled: true }];

  store.saveSlots(slots);

  assert.deepEqual(store.loadSlots(), slots);
});

test('returns an empty list for corrupt settings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maple-alarm-'));
  fs.writeFileSync(path.join(dir, 'slots.json'), '{bad json');
  const store = createStore(dir);

  assert.deepEqual(store.loadSlots(), []);
});
