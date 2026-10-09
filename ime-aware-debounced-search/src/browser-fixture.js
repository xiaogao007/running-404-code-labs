import { createSearchController } from './search-controller.js';
import { createFakeClock } from './fake-clock.js';
import { bindSearchInput } from './bind-input.js';

const input = document.querySelector('#search');
const realClock = new URLSearchParams(window.location.search).get('clock') === 'real';
const clock = realClock ? { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout } : createFakeClock();
document.querySelector('#clock-mode').textContent = realClock ? 'Native timers: manual testing mode' : 'Fake clock: deterministic automated testing mode';
document.querySelector('#advance').hidden = realClock;
const logs = Object.fromEntries(['naive', 'gate-only', 'fixed'].map(mode => [mode, []]));
const submits = [];
const provenance = [];
const controllers = {};
for (const mode of Object.keys(logs)) {
  const controller = createSearchController({
    mode, ...clock,
    search: value => {
      logs[mode].push(value);
      document.querySelector('#logs').textContent = JSON.stringify(logs, null, 2);
    },
    submit: value => submits.push({ mode, value }),
  });
  controllers[mode] = controller;
  bindSearchInput(input, controller);
}
for (const name of ['input', 'compositionstart', 'compositionend', 'keydown']) {
  input.addEventListener(name, event => provenance.push({
    type: event.type, isTrusted: event.isTrusted,
    isComposing: event.isComposing ?? null, inputType: event.inputType ?? null,
    value: input.value, data: event.data ?? null,
  }));
}
document.querySelector('#advance').addEventListener('click', () => clock.tick?.(300));
window.lab = { input, clock, logs, submits, provenance, controllers };
