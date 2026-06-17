const path = require('node:path');
const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  ipcMain,
  nativeImage
} = require('electron');
const { createStore } = require('./store');
const { createGlobalHotkeyMatcher } = require('./global-hotkeys');
const { createTimerManager } = require('./timers');

let mainWindow;
let tray;
let store;
let slots = [];
let registrationState = {};
let isQuitting = false;
let keyboardListener;
let keyboardListenerReady = false;
const persistentAlarms = new Map();

const hotkeyMatcher = createGlobalHotkeyMatcher((accelerator) => {
  manager.triggerHotkey(accelerator);
});

const manager = createTimerManager({
  emit: (event) => {
    if (event.type === 'timer-expired') {
      startPersistentAlarm(event.slot);
    }
    if (event.type === 'timer-started') {
      stopPersistentAlarm(event.slotId);
    }
    if (event.type === 'timers-paused') {
      stopAllPersistentAlarms();
    }
    broadcastState();
  }
});

function createTrayIcon() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">',
    '<rect width="32" height="32" rx="7" fill="#243447"/>',
    '<path d="M10 20h12M12 13h8M14 9h4" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>',
    '<circle cx="16" cy="23" r="2" fill="#80d8ff"/>',
    '</svg>'
  ].join('');
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 760,
    minHeight: 540,
    title: 'Maple Hotkey Alarm',
    backgroundColor: '#f5f7fb',
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
  tray = new Tray(createTrayIcon());
  tray.setToolTip('Maple Hotkey Alarm');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '열기', click: () => showMainWindow() },
    { label: '모든 타이머 정지', click: () => manager.pauseAll() },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on('double-click', () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
  mainWindow.show();
  mainWindow.focus();
  broadcastState();
}

function ensureKeyboardListener() {
  if (keyboardListener) return keyboardListenerReady;

  try {
    const { GlobalKeyboardListener } = require('node-global-key-listener');
    keyboardListener = new GlobalKeyboardListener();
    keyboardListener.addListener((event) => hotkeyMatcher.handleEvent(event));
    keyboardListenerReady = true;
  } catch (error) {
    keyboardListenerReady = false;
    console.error('Global keyboard listener failed:', error);
  }

  return keyboardListenerReady;
}

function registerShortcuts() {
  hotkeyMatcher.setSlots(slots);
  const ready = ensureKeyboardListener();
  const nextRegistration = {};

  for (const slot of slots) {
    if (!slot.enabled) {
      nextRegistration[slot.id] = { ok: false, reason: 'disabled' };
      continue;
    }

    nextRegistration[slot.id] = ready
      ? { ok: true }
      : { ok: false, reason: 'keyboard listener unavailable' };
  }

  registrationState = nextRegistration;
}

function state() {
  return { ...manager.getState(), registration: registrationState };
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state:changed', state());
  }
}

function notifyExpired(slot) {
  if (!Notification.isSupported()) return;
  new Notification({
    title: '알람 시간이 됐어요',
    body: slot.name
  }).show();
}

function startPersistentAlarm(slot) {
  stopPersistentAlarm(slot.id);
  notifyExpired(slot);
  playAlarm();
  const timer = setInterval(() => {
    notifyExpired(slot);
    playAlarm();
  }, 3000);
  persistentAlarms.set(slot.id, timer);
}

function stopPersistentAlarm(slotId) {
  const timer = persistentAlarms.get(slotId);
  if (!timer) return;
  clearInterval(timer);
  persistentAlarms.delete(slotId);
}

function stopAllPersistentAlarms() {
  for (const slotId of Array.from(persistentAlarms.keys())) {
    stopPersistentAlarm(slotId);
  }
}

function playAlarm() {
  const soundWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  soundWindow.loadFile(path.join(__dirname, '..', 'assets', 'alarm.html'));
}

ipcMain.handle('state:get', () => state());

ipcMain.handle('slots:save', (_event, nextSlots) => {
  const nextIds = new Set(nextSlots.map((slot) => slot.id).filter(Boolean));
  for (const slotId of Array.from(persistentAlarms.keys())) {
    if (!nextIds.has(slotId)) stopPersistentAlarm(slotId);
  }
  slots = store.saveSlots(nextSlots);
  manager.setSlots(slots);
  registerShortcuts();
  broadcastState();
  return state();
});

ipcMain.handle('timers:pause-all', () => {
  manager.pauseAll();
  return state();
});

ipcMain.handle('timers:acknowledge', (_event, slotId) => {
  stopPersistentAlarm(slotId);
  manager.acknowledgeAlarm(slotId);
  return state();
});

app.whenReady().then(() => {
  store = createStore(app.getPath('userData'));
  slots = store.loadSlots();
  manager.setSlots(slots);
  createWindow();
  createTray();
  registerShortcuts();
  setInterval(() => broadcastState(), 1000);

  app.on('activate', () => showMainWindow());
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('will-quit', () => {
  stopAllPersistentAlarms();
  if (keyboardListener && typeof keyboardListener.kill === 'function') {
    keyboardListener.kill();
  }
});
