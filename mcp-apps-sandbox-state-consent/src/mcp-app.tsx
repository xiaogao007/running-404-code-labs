import { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import "./styles.css";

type Flag = { key: string; enabled: boolean; revision: number };

const app = new App({ name: "Feature Flag Approval", version: "0.1.0" });
const initialFlag: Flag = { key: "new-ui", enabled: false, revision: 0 };

function ApprovalApp() {
  const [flag, setFlag] = useState(initialFlag);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("等待 Host 推送工具结果");

  async function requestChange() {
    const nextEnabled = !flag.enabled;
    const requestId = crypto.randomUUID();
    setPending(true);
    setMessage(`等待用户确认：${nextEnabled ? "开启" : "关闭"} ${flag.key}`);
    // Host should render the confirmation UI. The server remains the final authority.
    const result = await app.callServerTool({
      name: "update-feature-flag",
      arguments: {
        key: flag.key,
        enabled: nextEnabled,
        requestId,
        idempotencyKey: requestId,
      },
    });
    const text = result.content?.find((item) => item.type === "text");
    if (text?.type === "text") setMessage(text.text);
    if (!result.isError) {
      setFlag((current) => ({ ...current, enabled: nextEnabled, revision: current.revision + 1 }));
    }
    setPending(false);
  }

  return (
    <main>
      <p className="eyebrow">MCP App / sandboxed UI</p>
      <h1>Feature Flag Approval</h1>
      <p className="muted">Host controls the iframe and confirmation. This UI only requests an action.</p>
      <section className="panel">
        <div>
          <strong>{flag.key}</strong>
          <span className={flag.enabled ? "state on" : "state"}>{flag.enabled ? "ON" : "OFF"}</span>
        </div>
        <small>revision: {flag.revision}</small>
        <button disabled={pending} onClick={requestChange}>
          {pending ? "Waiting..." : "Request change"}
        </button>
      </section>
      <p role="status" className="status">{message}</p>
    </main>
  );
}

app.ontoolresult = (result) => {
  const text = result.content?.find((item) => item.type === "text");
  if (text?.type === "text") document.title = `Feature Flag: ${text.text}`;
};

app.connect().catch((error) => {
  console.error("MCP App connection failed", error);
});

createRoot(document.getElementById("root")!).render(<ApprovalApp />);
