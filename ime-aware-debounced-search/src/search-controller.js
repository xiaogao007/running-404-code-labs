/** Small debounce state machine. It does not fetch or render remote results. */
export function createSearchController({
  mode = 'fixed', delay = 300, search, submit = () => {},
  setTimeout: scheduleTimeout = globalThis.setTimeout,
  clearTimeout: cancelTimeout = globalThis.clearTimeout,
}) {
  if (!['naive', 'gate-only', 'fixed'].includes(mode)) throw new Error('Unknown mode');
  let composing = false;
  let destroyed = false;
  let timer;
  let currentValue = '';
  let lastSearchedValue;

  function cancel() {
    if (timer !== undefined) cancelTimeout(timer);
    timer = undefined;
  }
  function queue(value) {
    cancel();
    if (value === '') {
      // Clearing the field starts a new query session, allowing a previous term again.
      lastSearchedValue = undefined;
      return;
    }
    if (value === lastSearchedValue) return;
    timer = scheduleTimeout(() => {
      timer = undefined;
      if (destroyed || (mode === 'fixed' && composing)) return;
      lastSearchedValue = value;
      search(value);
    }, delay);
  }
  return {
    input(value, { isComposing = false } = {}) {
      if (destroyed) return;
      currentValue = value;
      if (mode !== 'naive' && (composing || isComposing)) {
        if (mode === 'fixed') cancel();
        return;
      }
      queue(value);
    },
    compositionStart() {
      if (destroyed) return;
      composing = true;
      if (mode === 'fixed') cancel();
    },
    compositionEnd(value) {
      if (destroyed) return;
      composing = false;
      currentValue = value;
      if (mode !== 'naive') queue(value);
    },
    enter(value, { isComposing = false } = {}) {
      if (destroyed || composing || isComposing) return false;
      cancel();
      submit(value);
      return true;
    },
    destroy() {
      destroyed = true;
      cancel();
    },
    get state() {
      return { composing, destroyed, currentValue, timerPending: timer !== undefined };
    },
  };
}
