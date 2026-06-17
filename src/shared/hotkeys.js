const MODIFIER_MAP = new Map([
  ['control', 'CommandOrControl'],
  ['ctrl', 'CommandOrControl'],
  ['commandorcontrol', 'CommandOrControl'],
  ['alt', 'Alt'],
  ['shift', 'Shift'],
  ['meta', 'Super'],
  ['super', 'Super'],
  ['win', 'Super']
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
  ['arrowright', 'Right'],
  ['delete', 'Delete'],
  ['backspace', 'Backspace'],
  ['enter', 'Enter'],
  ['return', 'Enter'],
  ['tab', 'Tab']
]);

function normalizeKey(key) {
  if (key === ' ') return 'Space';
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
    throw new Error('Hotkey must include a regular key.');
  }

  return [...modifiers, ...nonModifiers].join('+');
}

function describeAccelerator(accelerator) {
  return String(accelerator || '')
    .split('+')
    .filter(Boolean)
    .map((part) => DISPLAY_MODIFIER_MAP.get(part) || part)
    .join(' + ');
}

function eventToAccelerator(event) {
  const keys = [];
  if (event.ctrlKey) keys.push('Control');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');
  if (event.metaKey) keys.push('Meta');
  keys.push(event.key);
  return normalizeAccelerator(keys);
}

module.exports = { normalizeAccelerator, describeAccelerator, eventToAccelerator };
