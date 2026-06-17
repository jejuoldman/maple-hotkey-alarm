const crypto = require('node:crypto');

function normalizeSlot(input) {
  const id = input.id || crypto.randomUUID();
  const name = String(input.name || '').trim() || '알림';
  const accelerator = String(input.accelerator || '').trim();
  const durationSeconds = Number(input.durationSeconds);
  const enabled = input.enabled !== false;

  if (!accelerator) {
    throw new Error('Slot requires a hotkey.');
  }

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
