import {
  Fragment,
  ViewTransition,
  addTransitionType,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const cards = [
  { id: "signals", eyebrow: "01 / Signals", title: "把状态变化说清楚", body: "只有被标记为 Transition 的更新，才会触发 React 的 ViewTransition。" },
  { id: "direction", eyebrow: "02 / Direction", title: "让方向成为语义", body: "addTransitionType 把前进和后退交给动画回调，而不是把逻辑散落在样式里。" },
  { id: "boundary", eyebrow: "03 / Boundary", title: "把一组节点当成边界", body: "Fragment ref 可以对一组一级 DOM 子节点绑定事件、聚焦或建立观察。" },
];

function recordTransitionEvent(phase, types) {
  window.__reactTransitionEvents ??= [];
  window.__reactTransitionEvents.push({ phase, types: [...types] });
}

function Card({ card }) {
  return (
    <ViewTransition
      name="release-card"
      onUpdate={(instance, types) => {
        recordTransitionEvent("update", types);
        const fromX = types.includes("forward") ? 28 : -28;
        const animation = instance.new.animate(
          [
            { opacity: 0, transform: `translateX(${fromX}px)` },
            { opacity: 1, transform: "translateX(0)" },
          ],
          { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
        return () => animation.cancel();
      }}
    >
      <article className="card" data-testid="release-card">
        <p>{card.eyebrow}</p>
        <h2>{card.title}</h2>
        <span>{card.body}</span>
      </article>
    </ViewTransition>
  );
}

function FragmentRefDemo() {
  const groupRef = useRef(null);
  const [message, setMessage] = useState("尚未触发分组事件");

  useEffect(() => {
    const handleClick = (event) => {
      setMessage(`分组捕获到：${event.target.dataset.label}`);
    };

    groupRef.current.addEventListener("click", handleClick);
    return () => groupRef.current?.removeEventListener("click", handleClick);
  }, []);

  return (
    <section className="fragment-demo" aria-labelledby="fragment-title">
      <div>
        <p className="kicker">Fragment ref</p>
        <h2 id="fragment-title">没有额外 wrapper 的分组交互</h2>
      </div>
      <Fragment ref={groupRef}>
        <button data-label="草稿" type="button">保存草稿</button>
        <button data-label="预览" type="button">打开预览</button>
      </Fragment>
      <button className="quiet" type="button" onClick={() => groupRef.current.focus()}>
        聚焦这组控件
      </button>
      <output data-testid="fragment-status">{message}</output>
    </section>
  );
}

function App() {
  const [index, setIndex] = useState(0);
  const [transitionCount, setTransitionCount] = useState(0);
  const browserSupportsViewTransitions = "startViewTransition" in document;

  const changeCard = (direction) => {
    const nextIndex = (index + direction + cards.length) % cards.length;
    startTransition(() => {
      addTransitionType(direction > 0 ? "forward" : "backward");
      setIndex(nextIndex);
      setTransitionCount((count) => count + 1);
    });
  };

  return (
    <main>
      <header>
        <p className="kicker">React 19.3 verification lab</p>
        <h1>ViewTransition 和 Fragment ref</h1>
        <p>用一个可验证的小界面，检查 Transition 语义与无 wrapper 的节点分组。</p>
      </header>

      <section className="transition-demo" aria-labelledby="transition-title">
        <div className="section-title">
          <div>
            <p className="kicker">ViewTransition</p>
            <h2 id="transition-title">方向明确的内容切换</h2>
          </div>
          <output data-testid="transition-count">已执行 {transitionCount} 次 Transition 更新</output>
        </div>
        <div className="stage"><Card card={cards[index]} /></div>
        <nav aria-label="内容切换">
          <button type="button" onClick={() => changeCard(-1)}>上一张</button>
          <button type="button" onClick={() => changeCard(1)}>下一张</button>
        </nav>
        <p className="support" data-testid="view-transition-support">
          浏览器 View Transition API：{browserSupportsViewTransitions ? "可用" : "不可用；React 仍会完成状态更新"}
        </p>
      </section>

      <FragmentRefDemo />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
