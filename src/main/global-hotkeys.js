const MODIFIER_ALIASES = new Map([
  ['LEFT CTRL', 'CommandOrControl'],
  ['RIGHT CTRL', 'CommandOrControl'],
  ['CTRL', 'CommandOrControl'],
  ['CONTROL', 'CommandOrControl'],
  ['LEFT ALT', 'Alt'],
  ['RIGHT ALT', 'Alt'],
  ['ALT', 'Alt'],
  ['LEFT SHIFT', 'Shift'],
  ['RIGHT SHIFT', 'Shift'],
  ['SHIFT', 'Shift'],
  ['LEFT META', 'Super'],
  ['RIGHT META', 'Super'],
  ['LEFT WINDOWS', 'Super'],
  ['RIGHT WINDOWS', 'Super'],
  ['WIN', 'Super'],
  ['WINDOWS', 'Super']
]);

const KEY_ALIASES = new Map([
  ['ESCAPE', 'Esc'],
  ['SPACE', 'Space'],
  ['SPACEBAR', 'Space'],
  ['RETURN', 'Enter'],
  ['ARROW UP', 'Up'],
  ['ARROW DOWN', 'Down'],
  ['ARROW LEFT', 'Left'],
  ['ARROW RIGHT', 'Right'],
  ['UP ARROW', 'Up'],
  ['DOWN ARROW', 'Down'],
  ['LEFT ARROW', 'Left'],
  ['RIGHT ARROW', 'Right']
]);

function titleCaseKey(name) {
  return name
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function normalizeNativeKeyName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();

  if (MODIFIER_ALIASES.has(upper)) return MODIFIER_ALIASES.get(upper);
  if (KEY_ALIASES.has(upper)) return KEY_ALIASES.get(upper);
  if (/^F\d{1,2}$/.test(upper)) return upper;
  if (upper.length === 1) return upper;
  return titleCaseKey(upper);
}

function partsForAccelerator(accelerator) {
  return String(accelerator || '')
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
}

function createGlobalHotkeyMatcher(onMatch) {
  let slots = [];
  const pressed = new Set();
  const activeMatches = new Set();

  function setSlots(nextSlots) {
    slots = nextSlots;
    activeMatches.clear();
  }

  function handleEvent(event) {
    const key = normalizeNativeKeyName(event.name || event.rawKey || event.key);
    if (!key) return;

    const state = String(event.state || '').toUpperCase();
    if (state === 'UP' || state === 'RELEASED') {
      pressed.delete(key);
      for (const accelerator of Array.from(activeMatches)) {
        if (partsForAccelerator(accelerator).includes(key)) {
          activeMatches.delete(accelerator);
        }
      }
      return;
    }

    pressed.add(key);

    for (const slot of slots) {
      if (!slot.enabled) continue;
      const parts = partsForAccelerator(slot.accelerator);
      if (!parts.length) continue;
      const matched = parts.every((part) => pressed.has(part));
      if (matched && !activeMatches.has(slot.accelerator)) {
        activeMatches.add(slot.accelerator);
        onMatch(slot.accelerator);
      }
    }
  }

  return { setSlots, handleEvent };
}

module.exports = { createGlobalHotkeyMatcher, normalizeNativeKeyName };
