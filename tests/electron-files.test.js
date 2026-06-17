const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Electron entry files exist', () => {
  assert.equal(fs.existsSync('src/main/main.js'), true);
  assert.equal(fs.existsSync('src/main/preload.js'), true);
  assert.equal(fs.existsSync('src/assets/alarm.html'), true);
});

test('main process wires global shortcuts, tray, and notifications', () => {
  const main = fs.readFileSync('src/main/main.js', 'utf8');

  assert.match(main, /globalShortcut\.register/);
  assert.match(main, /new Tray/);
  assert.match(main, /new Notification/);
  assert.match(main, /ipcMain\.handle\('slots:save'/);
});

test('preload exposes only the renderer API', () => {
  const preload = fs.readFileSync('src/main/preload.js', 'utf8');

  assert.match(preload, /contextBridge\.exposeInMainWorld\('mapleAlarm'/);
  assert.match(preload, /ipcRenderer\.invoke\('state:get'/);
  assert.doesNotMatch(preload, /nodeIntegration/);
});
