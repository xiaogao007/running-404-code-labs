const params = new URLSearchParams(window.location.search);
const targetOrigin = params.get("targetOrigin");
const state = params.get("state");

function send(message) {
  window.opener?.postMessage(message, targetOrigin);
}

document.querySelector("#send-valid").addEventListener("click", () => {
  send({ type: "oauth.callback", version: 1, code: "demo-code-1234", state });
});

document.querySelector("#send-malformed").addEventListener("click", () => {
  send({ type: "oauth.callback", version: 1, state });
});
