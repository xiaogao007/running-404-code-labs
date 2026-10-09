/** DOM bridge: compositionend reads the whole input.value, never event.data. */
export function bindSearchInput(input, controller) {
  const handlers = {
    input(event) {
      controller.input(input.value, { isComposing: event.isComposing });
    },
    compositionstart() { controller.compositionStart(); },
    compositionend() { controller.compositionEnd(input.value); },
    keydown(event) {
      if (event.key !== 'Enter') return;
      const handled = controller.enter(input.value, { isComposing: event.isComposing });
      // This fixture has no form or navigation. Stop its Enter default action.
      if (handled) event.preventDefault();
    },
  };
  for (const [name, handler] of Object.entries(handlers)) input.addEventListener(name, handler);
  return () => {
    for (const [name, handler] of Object.entries(handlers)) input.removeEventListener(name, handler);
    controller.destroy();
  };
}
