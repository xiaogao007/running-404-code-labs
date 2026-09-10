import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const PARENT_ORIGIN = "http://127.0.0.1:4174";
const CALLBACK_ORIGIN = "http://127.0.0.1:4175";
const DEMO_STATE = "demo-state-71c9";

function validateCallback(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "message is not an object";
  }

  const keys = Object.keys(value).sort();
  const expectedKeys = ["code", "state", "type", "version"];
  if (keys.join(",") !== expectedKeys.join(",")) {
    return "message schema has missing or unexpected fields";
  }
  if (value.type !== "oauth.callback" || value.version !== 1) {
    return "message type or version is unsupported";
  }
  if (typeof value.code !== "string" || value.code.length < 8) {
    return "authorization code is invalid";
  }
  if (typeof value.state !== "string") {
    return "state is invalid";
  }
  return null;
}

function App() {
  const popupRef = useRef(null);
  const [status, setStatus] = useState("等待打开回调窗口");

  useEffect(() => {
    function receiveCallback(event) {
      if (event.origin !== CALLBACK_ORIGIN) {
        setStatus(`已拒绝：origin 不匹配（${event.origin}）`);
        return;
      }
      if (event.source !== popupRef.current) {
        setStatus("已拒绝：消息不来自预期 popup");
        return;
      }

      const schemaError = validateCallback(event.data);
      if (schemaError) {
        setStatus(`已拒绝：${schemaError}`);
        return;
      }
      if (event.data.state !== DEMO_STATE) {
        setStatus("已拒绝：state 不匹配");
        return;
      }
      setStatus("已接收：回调通过 origin、source、schema 和 state 校验");
    }

    window.addEventListener("message", receiveCallback);
    return () => window.removeEventListener("message", receiveCallback);
  }, []);

  function openCallback() {
    const url = new URL(`${CALLBACK_ORIGIN}/callback.html`);
    url.searchParams.set("targetOrigin", PARENT_ORIGIN);
    url.searchParams.set("state", DEMO_STATE);
    popupRef.current = window.open(url, `oauth-demo-${Date.now()}`, "popup,width=520,height=360");
    setStatus("已打开预期回调窗口，等待消息");
  }

  return (
    <main className="app">
      <header>
        <p className="eyebrow">postMessage security lab</p>
        <h1>OAuth popup 回调，不只校验一件事</h1>
        <p>父页面固定预期回调 origin，并验证消息来源、形状与关联 state。</p>
      </header>
      <section aria-labelledby="contract-title">
        <h2 id="contract-title">接收契约</h2>
        <dl>
          <div><dt>origin</dt><dd>{CALLBACK_ORIGIN}</dd></div>
          <div><dt>state</dt><dd>{DEMO_STATE}</dd></div>
          <div><dt>schema</dt><dd>oauth.callback v1</dd></div>
        </dl>
        <button type="button" onClick={openCallback}>打开预期回调页</button>
        <output aria-live="polite" data-testid="callback-status">{status}</output>
      </section>
      <aside>
        <strong>实验边界</strong>
        <p>示例不请求 OAuth 服务、不保存 token，也不替代服务端的 PKCE、redirect URI 与授权码校验。</p>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
