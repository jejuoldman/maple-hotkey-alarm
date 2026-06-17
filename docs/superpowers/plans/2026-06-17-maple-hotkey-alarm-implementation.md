# Maple Hotkey Alarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop app that manages multiple MapleStory reminder slots, detects user-defined global hotkeys while another app is focused, keeps running in the Windows tray, and produces simple Windows download artifacts.

**Architecture:** Keep timer, hotkey registration, persistence, notifications, and tray behavior in Electron's main process. Keep the renderer as a focused UI that edits slots and displays state received through IPC. Put pure logic in small CommonJS modules so it can be tested with `node:test` before wiring Electron.

**Tech Stack:** Electron, vanilla HTML/CSS/JavaScript, CommonJS modules, `node:test`, `electron-builder`.

---

## File Structure

- `package.json`: npm scripts, Electron dependency, test command, and Windows build config.
- `README.md`: user download/run instructions and developer commands.
- `src/shared/hotkeys.js`: normalize captured key combinations to Electron accelerator strings.
- `src/shared/slots.js`: validate and normalize slot data.
- `src/main/store.js`: load/save slot settings as JSON under Electron `userData`.
- `src/main/timers.js`: timer state machine independent from Electron APIs.
- `src/main/main.js`: Electron app lifecycle, tray, window, global shortcuts, notifications, and IPC.
- `src/main/preload.js`: safe IPC bridge exposed to the renderer.
- `src/renderer/index.html`: app shell.
- `src/renderer/styles.css`: compact desktop UI styling.
- `src/renderer/renderer.js`: slot form, list rendering, hotkey capture, and IPC calls.
- `src/assets/alarm.html`: short Web Audio alarm page used by hidden `BrowserWindow` playback.
- `tests/hotkeys.test.js`: hotkey normalization tests.
- `tests/slots.test.js`: slot validation tests.
- `tests/store.test.js`: persistence tests against a temp directory.
- `tests/timers.test.js`: timer start/reset/expiration tests.

## Commands

Use the bundled Node if system `node` is unavailable:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\*.test.js
```

After dependencies are installed:

```powershell
npm test
npm start
npm run dist
```

## Task 1: Project Scaffold And Scripts

**Files:**
- Create: `package.json`
- Create: `README.md`

- [ ] **Step 1: Write the failing package metadata check**

Create `tests/package.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('package defines Electron app scripts and Windows build outputs', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  assert.equal(pkg.main, 'src/main/main.js');
  assert.equal(pkg.scripts.start, 'electron .');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
  assert.equal(pkg.scripts.dist, 'electron-builder --win nsis portable');
  assert.deepEqual(pkg.build.win.target, ['nsis', 'portable']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\package.test.js
```

Expected: FAIL because `package.json` does not exist.

- [ ] **Step 3: Add minimal scaffold**

Create `package.json`:

```json
{
  "name": "maple-hotkey-alarm",
  "version": "0.1.0",
  "description": "Windows desktop hotkey alarm app for MapleStory farming sessions.",
  "main": "src/main/main.js",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "test": "node --test tests/*.test.js",
    "dist": "electron-builder --win nsis portable"
  },
  "devDependencies": {
    "electron": "^31.7.7",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.local.maple-hotkey-alarm",
    "productName": "Maple Hotkey Alarm",
    "directories": {
      "output": "release"
    },
    "files": [
      "src/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        "nsis",
        "portable"
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

Create `README.md`:

```md
# Maple Hotkey Alarm

Windows desktop alarm app for MapleStory farming sessions.

## Download

Use the files generated in `release/`:

- Installer: `Maple Hotkey Alarm Setup ... .exe`
- Portable: `Maple Hotkey Alarm ... .exe`

The first version is unsigned, so Windows SmartScreen may show a warning.

## Development

```powershell
npm install
npm test
npm start
npm run dist
```
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\package.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json README.md tests/package.test.js
git commit -m "chore: scaffold Electron package"
```

## Task 2: Hotkey Normalization

**Files:**
- Create: `src/shared/hotkeys.js`
- Test: `tests/hotkeys.test.js`

- [ ] **Step 1: Write failing hotkey tests**

Create `tests/hotkeys.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAccelerator, describeKeys } = require('../src/shared/hotkeys');

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

test('describes keys in Korean-friendly display text', () => {
  assert.equal(describeKeys(['Control', 'Alt', 's']), 'Ctrl + Alt + S');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\hotkeys.test.js
```

Expected: FAIL because `src/shared/hotkeys.js` does not exist.

- [ ] **Step 3: Implement hotkey normalization**

Create `src/shared/hotkeys.js`:

```js
const MODIFIER_MAP = new Map([
  ['control', 'CommandOrControl'],
  ['ctrl', 'CommandOrControl'],
  ['commandorcontrol', 'CommandOrControl'],
  ['alt', 'Alt'],
  ['shift', 'Shift'],
  ['meta', 'Super'],
  ['super', 'Super']
]);

const DISPLAY_MODIFIER_MAP = new Map([
  ['CommandOrControl', 'Ctrl'],
  ['Alt', 'Alt'],
  ['Shift', 'Shift'],
  ['Super', 'Win']
]);

const KEY_ALIASES = new Map([
  [' ', 'Space'],
  ['spacebar', 'Space'],
  ['escape', 'Esc'],
  ['esc', 'Esc'],
  ['arrowup', 'Up'],
  ['arrowdown', 'Down'],
  ['arrowleft', 'Left'],
  ['arrowright', 'Right']
]);

function normalizeKey(key) {
  const raw = String(key || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (MODIFIER_MAP.has(lower)) return MODIFIER_MAP.get(lower);
  if (KEY_ALIASES.has(lower)) return KEY_ALIASES.get(lower);
  if (/^f\d{1,2}$/i.test(raw)) return raw.toUpperCase();
  if (raw.length === 1) return raw.toUpperCase();
  return raw[0].toUpperCase() + raw.slice(1);
}

function normalizeAccelerator(keys) {
  const normalized = Array.from(new Set(keys.map(normalizeKey).filter(Boolean)));
  const modifiers = ['CommandOrControl', 'Alt', 'Shift', 'Super'].filter((key) => normalized.includes(key));
  const nonModifiers = normalized.filter((key) => !DISPLAY_MODIFIER_MAP.has(key));
  if (nonModifiers.length === 0) {
    throw new Error('Hotkey must include a non-modifier key.');
  }
  return [...modifiers, nonModifiers[0]].join('+');
}

function describeKeys(keys) {
  return normalizeAccelerator(keys)
    .split('+')
    .map((part) => DISPLAY_MODIFIER_MAP.get(part) || part)
    .join(' + ');
}

module.exports = { normalizeAccelerator, describeKeys };
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\hotkeys.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/shared/hotkeys.js tests/hotkeys.test.js
git commit -m "feat: normalize hotkey accelerators"
```

## Task 3: Slot Validation

**Files:**
- Create: `src/shared/slots.js`
- Test: `tests/slots.test.js`

- [ ] **Step 1: Write failing slot tests**

Create `tests/slots.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\slots.test.js
```

Expected: FAIL because `src/shared/slots.js` does not exist.

- [ ] **Step 3: Implement slot validation**

Create `src/shared/slots.js`:

```js
const crypto = require('node:crypto');

function normalizeSlot(input) {
  const id = input.id || crypto.randomUUID();
  const name = String(input.name || '').trim() || '알림';
  const accelerator = String(input.accelerator || '').trim();
  const durationSeconds = Number(input.durationSeconds);
  const enabled = input.enabled !== false;

  if (!accelerator) throw new Error('Slot requires a hotkey.');
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Slot duration must be a positive number of seconds.');
  }

  return { id, name, accelerator, durationSeconds, enabled };
}

function validateSlots(slots) {
  const seen = new Map();
  for (const slot of slots) {
    if (!slot.enabled) continue;
    if (seen.has(slot.accelerator)) {
      throw new Error(`Duplicate hotkey: ${slot.accelerator}`);
    }
    seen.set(slot.accelerator, slot.id);
  }
  return slots;
}

module.exports = { normalizeSlot, validateSlots };
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\slots.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/shared/slots.js tests/slots.test.js
git commit -m "feat: validate alarm slots"
```

## Task 4: Persistence Store

**Files:**
- Create: `src/main/store.js`
- Test: `tests/store.test.js`

- [ ] **Step 1: Write failing store tests**

Create `tests/store.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\store.test.js
```

Expected: FAIL because `src/main/store.js` does not exist.

- [ ] **Step 3: Implement persistence**

Create `src/main/store.js`:

```js
const fs = require('node:fs');
const path = require('node:path');
const { normalizeSlot, validateSlots } = require('../shared/slots');

function createStore(userDataPath) {
  const filePath = path.join(userDataPath, 'slots.json');

  function loadSlots() {
    try {
      if (!fs.existsSync(filePath)) return [];
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(raw)) return [];
      return validateSlots(raw.map(normalizeSlot));
    } catch {
      return [];
    }
  }

  function saveSlots(slots) {
    fs.mkdirSync(userDataPath, { recursive: true });
    const normalized = validateSlots(slots.map(normalizeSlot));
    fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
    return normalized;
  }

  return { loadSlots, saveSlots };
}

module.exports = { createStore };
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\store.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/store.js tests/store.test.js
git commit -m "feat: persist alarm slots"
```

## Task 5: Timer Manager

**Files:**
- Create: `src/main/timers.js`
- Test: `tests/timers.test.js`

- [ ] **Step 1: Write failing timer tests**

Create `tests/timers.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTimerManager } = require('../src/main/timers');

test('starts and reports remaining time', () => {
  const events = [];
  const manager = createTimerManager({ now: () => 1000, emit: (event) => events.push(event) });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 60, enabled: true }]);

  manager.triggerHotkey('Alt+A');

  assert.equal(manager.getState().timers.a.remainingSeconds, 60);
  assert.equal(events[0].type, 'timer-started');
});

test('same hotkey resets running timer to full duration', () => {
  let now = 1000;
  const manager = createTimerManager({ now: () => now, emit: () => {} });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 60, enabled: true }]);
  manager.triggerHotkey('Alt+A');
  now = 31000;

  manager.triggerHotkey('Alt+A');

  assert.equal(manager.getState().timers.a.remainingSeconds, 60);
});

test('tick expires timers', () => {
  let now = 1000;
  const events = [];
  const manager = createTimerManager({ now: () => now, emit: (event) => events.push(event) });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 1, enabled: true }]);
  manager.triggerHotkey('Alt+A');
  now = 2500;

  manager.tick();

  assert.equal(manager.getState().timers.a.status, 'expired');
  assert.equal(events.at(-1).type, 'timer-expired');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\timers.test.js
```

Expected: FAIL because `src/main/timers.js` does not exist.

- [ ] **Step 3: Implement timer manager**

Create `src/main/timers.js`:

```js
function createTimerManager({ now = Date.now, emit = () => {} } = {}) {
  let slots = [];
  const timers = {};

  function setSlots(nextSlots) {
    slots = nextSlots;
    for (const slot of slots) {
      if (!timers[slot.id]) {
        timers[slot.id] = { status: 'idle', remainingSeconds: slot.durationSeconds, endsAt: null };
      }
    }
    for (const id of Object.keys(timers)) {
      if (!slots.some((slot) => slot.id === id)) delete timers[id];
    }
  }

  function getState() {
    tick();
    return { slots, timers: structuredClone(timers) };
  }

  function triggerHotkey(accelerator) {
    const slot = slots.find((candidate) => candidate.enabled && candidate.accelerator === accelerator);
    if (!slot) return false;
    timers[slot.id] = {
      status: 'running',
      remainingSeconds: slot.durationSeconds,
      endsAt: now() + slot.durationSeconds * 1000
    };
    emit({ type: 'timer-started', slotId: slot.id });
    return true;
  }

  function tick() {
    for (const slot of slots) {
      const timer = timers[slot.id];
      if (!timer || timer.status !== 'running') continue;
      const remaining = Math.max(0, Math.ceil((timer.endsAt - now()) / 1000));
      timer.remainingSeconds = remaining;
      if (remaining === 0) {
        timer.status = 'expired';
        timer.endsAt = null;
        emit({ type: 'timer-expired', slotId: slot.id, slot });
      }
    }
  }

  function pauseAll() {
    for (const timer of Object.values(timers)) {
      if (timer.status === 'running') {
        timer.status = 'idle';
        timer.endsAt = null;
      }
    }
    emit({ type: 'timers-paused' });
  }

  return { setSlots, getState, triggerHotkey, tick, pauseAll };
}

module.exports = { createTimerManager };
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\timers.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/timers.js tests/timers.test.js
git commit -m "feat: manage alarm timers"
```

## Task 6: Electron Main Process

**Files:**
- Create: `src/main/main.js`
- Create: `src/main/preload.js`
- Create: `src/assets/alarm.html`

- [ ] **Step 1: Write a smoke syntax check target**

Add `tests/electron-files.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Electron entry files exist', () => {
  assert.equal(fs.existsSync('src/main/main.js'), true);
  assert.equal(fs.existsSync('src/main/preload.js'), true);
  assert.equal(fs.existsSync('src/assets/alarm.html'), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\electron-files.test.js
```

Expected: FAIL because Electron entry files do not exist.

- [ ] **Step 3: Implement Electron main/preload/alarm files**

Create `src/main/preload.js`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mapleAlarm', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSlots: (slots) => ipcRenderer.invoke('slots:save', slots),
  pauseAll: () => ipcRenderer.invoke('timers:pause-all'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:changed', listener);
    return () => ipcRenderer.removeListener('state:changed', listener);
  }
});
```

Create `src/assets/alarm.html`:

```html
<!doctype html>
<html>
<body>
<script>
const audio = new AudioContext();
function tone(start, frequency, duration) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0.0001, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.28, audio.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  oscillator.start(audio.currentTime + start);
  oscillator.stop(audio.currentTime + start + duration);
}
tone(0, 880, 0.22);
tone(0.3, 660, 0.22);
tone(0.6, 880, 0.36);
setTimeout(() => window.close(), 1300);
</script>
</body>
</html>
```

Create `src/main/main.js` with Electron lifecycle, tray, shortcuts, and IPC:

```js
const path = require('node:path');
const { app, BrowserWindow, Menu, Notification, Tray, globalShortcut, ipcMain } = require('electron');
const { createStore } = require('./store');
const { createTimerManager } = require('./timers');

let mainWindow;
let tray;
let isQuitting = false;
let slots = [];
let store;

const manager = createTimerManager({
  emit: (event) => {
    if (event.type === 'timer-expired') {
      notifyExpired(event.slot);
      playAlarm();
    }
    broadcastState();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    title: 'Maple Hotkey Alarm',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, '..', 'assets', 'tray.ico'));
  tray.setToolTip('Maple Hotkey Alarm');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open app', click: () => mainWindow.show() },
    { label: 'Pause all timers', click: () => manager.pauseAll() },
    { type: 'separator' },
    { label: 'Exit', click: () => { isQuitting = true; app.quit(); } }
  ]));
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const registration = {};
  for (const slot of slots) {
    if (!slot.enabled) {
      registration[slot.id] = { ok: false, reason: 'disabled' };
      continue;
    }
    const ok = globalShortcut.register(slot.accelerator, () => manager.triggerHotkey(slot.accelerator));
    registration[slot.id] = ok ? { ok: true } : { ok: false, reason: 'registration failed' };
  }
  return registration;
}

let registrationState = {};

function state() {
  return { ...manager.getState(), registration: registrationState };
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state:changed', state());
  }
}

function notifyExpired(slot) {
  if (Notification.isSupported()) {
    new Notification({ title: '알람 시간이 됐어요', body: slot.name }).show();
  }
}

function playAlarm() {
  const soundWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
  soundWindow.loadFile(path.join(__dirname, '..', 'assets', 'alarm.html'));
}

ipcMain.handle('state:get', () => state());
ipcMain.handle('slots:save', (_event, nextSlots) => {
  slots = store.saveSlots(nextSlots);
  manager.setSlots(slots);
  registrationState = registerShortcuts();
  broadcastState();
  return state();
});
ipcMain.handle('timers:pause-all', () => {
  manager.pauseAll();
  return state();
});

app.whenReady().then(() => {
  store = createStore(app.getPath('userData'));
  slots = store.loadSlots();
  manager.setSlots(slots);
  createWindow();
  createTray();
  registrationState = registerShortcuts();
  setInterval(() => broadcastState(), 1000).unref();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
```

If `Tray` fails because `tray.ico` is missing during implementation, create a tiny icon in `src/assets/tray.ico` or switch to a generated native image before running the app.

- [ ] **Step 4: Run the file existence test and syntax checks**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\electron-files.test.js
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check src\main\main.js
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check src\main\preload.js
```

Expected: PASS and no syntax errors.

- [ ] **Step 5: Commit**

```powershell
git add src/main/main.js src/main/preload.js src/assets/alarm.html tests/electron-files.test.js
git commit -m "feat: wire Electron background behavior"
```

## Task 7: Renderer UI

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/styles.css`
- Create: `src/renderer/renderer.js`

- [ ] **Step 1: Write renderer file test**

Create `tests/renderer-files.test.js`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\renderer-files.test.js
```

Expected: FAIL because renderer files do not exist.

- [ ] **Step 3: Implement renderer shell**

Create `src/renderer/index.html`, `src/renderer/styles.css`, and `src/renderer/renderer.js` with:

```html
<!-- src/renderer/index.html -->
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Maple Hotkey Alarm</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main class="app">
    <header class="toolbar">
      <h1>Maple Hotkey Alarm</h1>
      <button id="pause-all" type="button">Pause All</button>
    </header>
    <section id="slot-form" class="panel">
      <input id="slot-name" placeholder="알림 이름" value="재획 알림">
      <button class="preset" data-seconds="120" type="button">2분</button>
      <button class="preset" data-seconds="300" type="button">5분</button>
      <button class="preset" data-seconds="600" type="button">10분</button>
      <input id="minutes" type="number" min="0" value="5" aria-label="분">
      <input id="seconds" type="number" min="0" max="59" value="0" aria-label="초">
      <button id="capture-hotkey" type="button">조합키 입력</button>
      <button id="add-slot" type="button">추가</button>
    </section>
    <section id="slot-list" class="slot-list"></section>
  </main>
  <script src="./renderer.js"></script>
</body>
</html>
```

The JavaScript must call `window.mapleAlarm.saveSlots(slots)` after add/delete and render `state.registration` failures beside each slot.

- [ ] **Step 4: Run the renderer test and syntax check**

Run:

```powershell
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests\renderer-files.test.js
& "C:\Users\sjs11\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --check src\renderer\renderer.js
```

Expected: PASS and no syntax errors.

- [ ] **Step 5: Commit**

```powershell
git add src/renderer/index.html src/renderer/styles.css src/renderer/renderer.js tests/renderer-files.test.js
git commit -m "feat: add alarm slot UI"
```

## Task 8: Build And Manual Verification

**Files:**
- Modify: `README.md`
- Modify if needed: `package.json`

- [ ] **Step 1: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules/` and `package-lock.json` are created.

- [ ] **Step 2: Run all automated tests**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Launch the app**

Run:

```powershell
npm start
```

Expected: Electron window opens with slot manager UI.

- [ ] **Step 4: Manually verify core behavior**

Verify:

- Add a slot with a Windows-friendly hotkey such as `Ctrl + Alt + S`.
- Focus another app and press the hotkey.
- Timer starts or resets in the app.
- Closing the window hides the app to the tray.
- Tray menu reopens and exits the app.
- Alarm notification and sound fire when the timer expires.

- [ ] **Step 5: Build download artifacts**

Run:

```powershell
npm run dist
```

Expected: `release/` contains an NSIS installer and portable executable.

- [ ] **Step 6: Update README with actual artifact names**

Open `release/`, record the produced installer and portable names, and update `README.md` download section with those exact names.

- [ ] **Step 7: Commit**

```powershell
git add package-lock.json README.md package.json
git commit -m "chore: document Windows release artifacts"
```

## Self-Review

- Spec coverage: The plan covers Electron app structure, global hotkeys, multiple slots, timer reset on same hotkey, tray background behavior, notifications, sound, local persistence, tests, and Windows installer/portable outputs.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation tasks remain. Task 7 intentionally defines renderer behavior at a higher level than pure modules, but still names exact files, commands, and required UI interactions.
- Type consistency: Slot fields are consistently `id`, `name`, `accelerator`, `durationSeconds`, and `enabled`. Timer state consistently uses `idle`, `running`, and `expired`.
