const elements = {
  list: document.querySelector('#slot-list'),
  name: document.querySelector('#slot-name'),
  minutes: document.querySelector('#minutes'),
  seconds: document.querySelector('#seconds'),
  add: document.querySelector('#add-slot'),
  pauseAll: document.querySelector('#pause-all'),
  capture: document.querySelector('#capture-hotkey'),
  emptyTemplate: document.querySelector('#empty-template')
};

const modifierMap = new Map([
  ['Control', 'CommandOrControl'],
  ['Alt', 'Alt'],
  ['Shift', 'Shift'],
  ['Meta', 'Super']
]);

let appState = { slots: [], timers: {}, registration: {} };
let capturedAccelerator = '';
let capturedDisplay = '';
let captureAbort = null;

function normalizeKey(key) {
  if (key === ' ') return 'Space';
  if (key === 'Escape') return 'Esc';
  if (key.startsWith('Arrow')) return key.replace('Arrow', '');
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function eventToAccelerator(event) {
  const keys = [];
  if (event.ctrlKey) keys.push('CommandOrControl');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');
  if (event.metaKey) keys.push('Super');

  const baseKey = normalizeKey(event.key);
  if (![...modifierMap.keys()].includes(event.key) && !keys.includes(baseKey)) {
    keys.push(baseKey);
  }

  const nonModifiers = keys.filter((key) => !['CommandOrControl', 'Alt', 'Shift', 'Super'].includes(key));
  if (!nonModifiers.length) {
    throw new Error('non-modifier key required');
  }

  return ['CommandOrControl', 'Alt', 'Shift', 'Super']
    .filter((key) => keys.includes(key))
    .concat(nonModifiers[0])
    .join('+');
}

function describeAccelerator(accelerator) {
  return accelerator
    .split('+')
    .map((part) => ({ CommandOrControl: 'Ctrl', Super: 'Win' })[part] || part)
    .join(' + ');
}

function secondsToClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function durationFromInputs() {
  const minutes = Number(elements.minutes.value || 0);
  const seconds = Number(elements.seconds.value || 0);
  return minutes * 60 + seconds;
}

function setDuration(totalSeconds) {
  elements.minutes.value = String(Math.floor(totalSeconds / 60));
  elements.seconds.value = String(totalSeconds % 60);
}

function stateLabel(status) {
  if (status === 'running') return '진행 중';
  if (status === 'expired') return '만료';
  return '대기';
}

function render() {
  elements.list.replaceChildren();

  if (!appState.slots.length) {
    elements.list.append(elements.emptyTemplate.content.cloneNode(true));
    return;
  }

  for (const slot of appState.slots) {
    const timer = appState.timers[slot.id] || { status: 'idle', remainingSeconds: slot.durationSeconds };
    const registration = appState.registration[slot.id];
    const row = document.createElement('article');
    row.className = 'slot';
    row.innerHTML = `
      <div>
        <div class="slot-name"></div>
        <div class="slot-sub"></div>
      </div>
      <div>
        <div class="slot-sub">조합키</div>
        <strong class="hotkey-text"></strong>
      </div>
      <div class="remaining"></div>
      <div class="state-pill"></div>
      <div class="register-status"></div>
      <button class="delete" type="button" title="삭제">X</button>
    `;

    row.querySelector('.slot-name').textContent = slot.name;
    row.querySelector('.slot-sub').textContent = `${secondsToClock(slot.durationSeconds)} 마다 알림`;
    row.querySelector('.hotkey-text').textContent = describeAccelerator(slot.accelerator);
    row.querySelector('.remaining').textContent = secondsToClock(timer.remainingSeconds);
    const pill = row.querySelector('.state-pill');
    pill.textContent = stateLabel(timer.status);
    pill.classList.add(`state-${timer.status}`);
    row.querySelector('.register-status').textContent = registration?.ok ? '등록됨' : `등록 실패${registration?.reason ? `: ${registration.reason}` : ''}`;
    row.querySelector('.delete').addEventListener('click', () => deleteSlot(slot.id));
    elements.list.append(row);
  }
}

async function refresh() {
  appState = await window.mapleAlarm.getState();
  render();
}

async function saveSlots(slots) {
  appState = await window.mapleAlarm.saveSlots(slots);
  render();
}

async function addSlot() {
  const durationSeconds = durationFromInputs();
  if (!capturedAccelerator) {
    elements.capture.classList.add('capturing');
    elements.capture.textContent = '먼저 조합키를 입력하세요';
    return;
  }
  if (durationSeconds <= 0) {
    elements.minutes.focus();
    return;
  }

  const nextSlot = {
    name: elements.name.value.trim() || '알림',
    accelerator: capturedAccelerator,
    durationSeconds,
    enabled: true
  };

  try {
    await saveSlots([...appState.slots, nextSlot]);
    capturedAccelerator = '';
    capturedDisplay = '';
    elements.capture.textContent = '조합키 입력';
  } catch (error) {
    elements.capture.textContent = error.message || '저장 실패';
  }
}

async function deleteSlot(id) {
  await saveSlots(appState.slots.filter((slot) => slot.id !== id));
}

function startCapture() {
  if (captureAbort) captureAbort.abort();
  captureAbort = new AbortController();
  elements.capture.classList.add('capturing');
  elements.capture.textContent = '누르는 중...';

  window.addEventListener('keydown', (event) => {
    event.preventDefault();
    try {
      capturedAccelerator = eventToAccelerator(event);
      capturedDisplay = describeAccelerator(capturedAccelerator);
      elements.capture.textContent = capturedDisplay;
      elements.capture.classList.remove('capturing');
      captureAbort.abort();
    } catch {
      elements.capture.textContent = '조합키 입력 중...';
    }
  }, { signal: captureAbort.signal });
}

document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach((preset) => preset.classList.remove('active'));
    button.classList.add('active');
    setDuration(Number(button.dataset.seconds));
  });
});

elements.capture.addEventListener('click', startCapture);
elements.add.addEventListener('click', addSlot);
elements.pauseAll.addEventListener('click', async () => {
  appState = await window.mapleAlarm.pauseAll();
  render();
});

window.mapleAlarm.onState((state) => {
  appState = state;
  render();
});

refresh();
