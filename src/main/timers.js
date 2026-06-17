function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createTimerManager({ now = Date.now, emit = () => {} } = {}) {
  let slots = [];
  const timers = {};

  function setSlots(nextSlots) {
    slots = nextSlots;

    for (const slot of slots) {
      if (!timers[slot.id]) {
        timers[slot.id] = { status: 'idle', remainingSeconds: slot.durationSeconds, endsAt: null };
      } else if (timers[slot.id].status === 'idle') {
        timers[slot.id].remainingSeconds = slot.durationSeconds;
      }
    }

    for (const id of Object.keys(timers)) {
      if (!slots.some((slot) => slot.id === id)) {
        delete timers[id];
      }
    }
  }

  function triggerHotkey(accelerator) {
    const slot = slots.find((candidate) => candidate.enabled && candidate.accelerator === accelerator);
    if (!slot) return false;

    timers[slot.id] = {
      status: 'running',
      remainingSeconds: slot.durationSeconds,
      endsAt: now() + slot.durationSeconds * 1000
    };
    emit({ type: 'timer-started', slotId: slot.id, slot });
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

  function getState() {
    tick();
    return { slots: clone(slots), timers: clone(timers) };
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

  return { setSlots, triggerHotkey, tick, getState, pauseAll };
}

module.exports = { createTimerManager };
