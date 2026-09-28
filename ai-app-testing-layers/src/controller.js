// Framework-independent presentation state. This is not a DOM/browser test.
export class ChatController {
  sequence = 0;
  state = { status: 'idle', text: '', error: null };
  switchSession() {
    this.sequence++;
    this.state = { status: 'idle', text: '', error: null };
  }
  async run(events) {
    const request = ++this.sequence;
    this.state = { status: 'waiting', text: '', error: null };
    try {
      for await (const event of events) {
        if (request !== this.sequence) return;
        if (event.type === 'text-delta') {
          this.state.text += event.text;
          this.state.status = 'streaming';
        }
        if (event.type === 'error' || event.type === 'tool-error') throw new Error('upstream');
      }
      if (request === this.sequence) this.state.status = this.state.text.trim() ? 'done' : 'empty';
    } catch {
      if (request === this.sequence) {
        this.state.status = 'error';
        this.state.error = 'Request failed';
      }
    }
  }
}
