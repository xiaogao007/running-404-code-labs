/** Deterministic clock shared by Node tests and the browser fixture. */
export function createFakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, due: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    tick(duration) {
      const until = now + duration;
      while (true) {
        const entry = [...timers.entries()]
          .filter(([, timer]) => timer.due <= until)
          .sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
        if (!entry) break;
        const [id, timer] = entry;
        timers.delete(id);
        now = timer.due;
        timer.callback();
      }
      now = until;
    },
    get pending() { return timers.size; },
  };
}
