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

test('tick expires timers once', () => {
  let now = 1000;
  const events = [];
  const manager = createTimerManager({ now: () => now, emit: (event) => events.push(event) });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 1, enabled: true }]);
  manager.triggerHotkey('Alt+A');
  now = 2500;

  manager.tick();
  manager.tick();

  assert.equal(manager.getState().timers.a.status, 'expired');
  assert.equal(events.filter((event) => event.type === 'timer-expired').length, 1);
});

test('pause all returns running timers to idle', () => {
  const manager = createTimerManager({ now: () => 1000, emit: () => {} });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 60, enabled: true }]);
  manager.triggerHotkey('Alt+A');

  manager.pauseAll();

  assert.equal(manager.getState().timers.a.status, 'idle');
});

test('acknowledges an expired alarm and returns it to idle', () => {
  let now = 1000;
  const events = [];
  const manager = createTimerManager({ now: () => now, emit: (event) => events.push(event) });
  manager.setSlots([{ id: 'a', name: '재획', accelerator: 'Alt+A', durationSeconds: 1, enabled: true }]);
  manager.triggerHotkey('Alt+A');
  now = 2500;
  manager.tick();

  manager.acknowledgeAlarm('a');

  assert.equal(manager.getState().timers.a.status, 'idle');
  assert.equal(events.at(-1).type, 'alarm-acknowledged');
});
