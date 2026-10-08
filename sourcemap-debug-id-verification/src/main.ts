import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: `http://public@${window.location.host}/1`,
  integrations: [Sentry.globalHandlersIntegration()],
  defaultIntegrations: false,
  beforeSend(event) {
    document.querySelector('#status')!.textContent = `Event: ${event.event_id}`;
    return event;
  },
});

export function failAtKnownLocation(): never {
  throw new Error(`source-map-lab-${import.meta.env.VITE_LAB_BUILD}`);
}

document.querySelector('#trigger')!.addEventListener('click', () => {
  setTimeout(failAtKnownLocation, 0);
});
