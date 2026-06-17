const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('renderer files exist and include app mount points', () => {
  const html = fs.readFileSync('src/renderer/index.html', 'utf8');

  assert.match(html, /slot-list/);
  assert.match(html, /slot-form/);
  assert.equal(fs.existsSync('src/renderer/styles.css'), true);
  assert.equal(fs.existsSync('src/renderer/renderer.js'), true);
});

test('renderer script uses preload API for state and saves', () => {
  const js = fs.readFileSync('src/renderer/renderer.js', 'utf8');

  assert.match(js, /window\.mapleAlarm\.getState/);
  assert.match(js, /window\.mapleAlarm\.saveSlots/);
  assert.match(js, /window\.mapleAlarm\.onState/);
  assert.match(js, /window\.mapleAlarm\.acknowledgeAlarm/);
  assert.match(js, /function editSlot/);
});
