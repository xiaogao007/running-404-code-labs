const params = new URLSearchParams(window.location.search);
const targetOrigin = params.get("targetOrigin");
const state = params.get("state");

document.querySelector("#send-attacker-message").addEventListener("click", () => {
  window.opener?.postMessage(
    { type: "oauth.callback", version: 1, code: "demo-code-1234", state },
    targetOrigin,
  );
});
