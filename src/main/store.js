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
