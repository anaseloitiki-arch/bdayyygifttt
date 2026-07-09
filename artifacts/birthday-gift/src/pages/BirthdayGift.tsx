import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type Stage = "locked" | "flash" | "revealed";
type IntroScope = "me" | "all";

function getStoredIntroScope(): IntroScope {
  if (typeof window === "undefined") return "me";
  const stored = window.localStorage.getItem("birthday-skip-intro-scope");
  return stored === "all" ? "all" : "me";
}

function getStoredSkipIntroEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("birthday-skip-intro-enabled") === "true";
}

const CHAT_STORAGE_KEY = "birthday-gift-chat-messages";
const CHAT_NAME_KEY = "birthday-gift-chat-name";
const CHAT_CHANNEL = "birthday-gift-chat-channel";

function createChatMessage(text: string, name: string, kind: "user" | "system") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    text,
    when: new Date().toISOString(),
    kind,
  };
}

function formatChatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ChatWidget({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{id:string; name:string; text:string; when:string; kind:"user"|"system"}[]>([]);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName = window.localStorage.getItem(CHAT_NAME_KEY) ?? "";
    setName(storedName);

    const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setMessages([createChatMessage("welcome to the chat — enter your name and send a message.", "system", "system")]);
      }
    } else {
      const welcome = createChatMessage("welcome to the chat — enter your name and send a message.", "system", "system");
      setMessages([welcome]);
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcome]));
    }

    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    window.localStorage.setItem(CHAT_NAME_KEY, name);
  }, [name, initialized]);

  useEffect(() => {
    if (!name.trim()) {
      setError("enter a name before sending");
    } else {
      setError("");
    }
  }, [name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CHAT_STORAGE_KEY && event.newValue) {
        try {
          setMessages(JSON.parse(event.newValue));
        } catch {
          // ignore malformed data
        }
      }
    };

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHAT_CHANNEL) : null;
    const handleChannel = (event: MessageEvent<{ type: string; messages: unknown }>) => {
      if (event.data?.type === "chat-update" && Array.isArray(event.data.messages)) {
        setMessages(event.data.messages as any);
      }
    };

    window.addEventListener("storage", handleStorage);
    channel?.addEventListener("message", handleChannel as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.removeEventListener("message", handleChannel as EventListener);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open]);

  const saveMessages = (next: typeof messages) => {
    setMessages(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHAT_CHANNEL);
      channel.postMessage({ type: "chat-update", messages: next });
      channel.close();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDraft = draft.trim();
    if (trimmedName.length < 2) {
      setError("enter the name people will see");
      return;
    }
    if (!trimmedDraft) {
      setError("write a message first");
      return;
    }

    const nextMessage = createChatMessage(trimmedDraft, trimmedName, "user");
    saveMessages([...messages, nextMessage].slice(-35));
    setDraft("");
    setError("");
  };

  return (
    <div className={`chat-widget${open ? " open" : ""}`}>
      <div className="chat-widget-top">
        <div>
          <p className="chat-widget-title">VIE CHAT</p>
          <p className="chat-widget-subtitle">visitor room</p>
        </div>
        <button className="chat-widget-toggle" onClick={onToggle}>{open ? "–" : "+"}</button>
      </div>

      {open && (
        <>
          <div className="chat-widget-body">
            <div className="chat-widget-messages">
              {messages.map((message) => (
                <div key={message.id} className={`chat-bubble ${message.kind === "system" ? "chat-system" : "chat-user"}`}>
                  <div className="chat-bubble-head">
                    <span>{message.name}</span>
                    <small>{formatChatTime(message.when)}</small>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <form className="chat-widget-form" onSubmit={handleSubmit}>
            <input
              className="chat-widget-name"
              type="text"
              placeholder="your displayed name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
            />
            <textarea
              className="chat-widget-input"
              placeholder="type a message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={160}
            />
            {error && <p className="chat-widget-error">{error}</p>}
            <button className="chat-widget-send" type="submit" disabled={!name.trim() || !draft.trim()}>
              send
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/* ─── Soft floating stars for stage 1 ─── */
interface Star {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  opacity: number;
  hue: number;
}

function useStars(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const starsRef = useRef<Star[]>([]);
  const animRef  = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    starsRef.current = Array.from({ length: 38 }, () => ({
      x:       Math.random() * window.innerWidth,
      y:       Math.random() * window.innerHeight,
      vx:      (Math.random() - 0.5) * 0.18,
      vy:      (Math.random() - 0.5) * 0.18,
      radius:  Math.random() * 1.6 + 0.4,
      opacity: Math.random() * 0.35 + 0.1,
      hue:     Math.random() * 50 + 270,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of starsRef.current) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width)  s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 5);
        g.addColorStop(0, `hsla(${s.hue}, 80%, 82%, ${s.opacity})`);
        g.addColorStop(1, `hsla(${s.hue}, 80%, 70%, 0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, canvasRef]);
}

function StarCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useStars(ref, active);
  return <canvas ref={ref} className="particles-canvas" />;
}

/* ─── 3D sword canvas ─── */
type HeartPhase = "none" | "in" | "out";

function Sword3DCanvas({
  show,
  onHeart,
}: {
  show: boolean;
  onHeart: (p: HeartPhase) => void;
}) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const onHeartRef = useRef(onHeart);
  useEffect(() => { onHeartRef.current = onHeart; }, [onHeart]);

  useEffect(() => {
    if (!show || !mountRef.current) return;
    const mount = mountRef.current;
    let mounted = true;

    const W = window.innerWidth, H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0, 12);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffd700, 1.8);
    dir.position.set(2, 4, 6);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, -1, 4);
    scene.add(fill);

    let leftSword: THREE.Object3D | null  = null;
    let rightSword: THREE.Object3D | null = null;
    let animId = 0;

    const SLIDE_MS  = 900;
    const CLASH_MS  = 500;
    const HEART_AT  = SLIDE_MS + CLASH_MS;          // 1400
    const HEARTOUT  = HEART_AT + 850;               // 2250
    const TOTAL_MS  = HEARTOUT + 550;               // 2800

    let heartFired    = false;
    let heartOutFired = false;
    const t0 = Date.now();
    const ease = (t: number) => 1 - Math.pow(1 - Math.min(t, 1), 3);

    const setOpacity = (obj: THREE.Object3D, opacity: number) => {
      obj.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => { (m as THREE.MeshPhongMaterial).transparent = true; (m as THREE.MeshPhongMaterial).opacity = opacity; });
      });
    };

    const tick = () => {
      if (!mounted) return;
      animId = requestAnimationFrame(tick);
      const elapsed = Date.now() - t0;

      if (leftSword && rightSword) {
        if (elapsed < SLIDE_MS) {
          const p = ease(elapsed / SLIDE_MS);
          leftSword.position.x  = -14 + p * 12;   // −14 → −2
          rightSword.position.x =  14 - p * 12;   //  14 →  2
        } else if (elapsed < SLIDE_MS + CLASH_MS) {
          const p = (elapsed - SLIDE_MS) / CLASH_MS;
          const shake = Math.sin(p * Math.PI * 10) * 0.28 * (1 - p);
          leftSword.position.x  = -2 + shake;
          rightSword.position.x =  2 - shake;
        } else {
          leftSword.position.x  = -2;
          rightSword.position.x =  2;
        }

        if (elapsed > HEARTOUT) {
          const p = Math.min((elapsed - HEARTOUT) / 550, 1);
          setOpacity(leftSword,  1 - p);
          setOpacity(rightSword, 1 - p);
        }
      }

      if (elapsed >= HEART_AT  && !heartFired)    { heartFired    = true; onHeartRef.current("in");   }
      if (elapsed >= HEARTOUT  && !heartOutFired) { heartOutFired = true; onHeartRef.current("out");  }
      if (elapsed >= TOTAL_MS)                    { onHeartRef.current("none"); cancelAnimationFrame(animId); return; }

      renderer.render(scene, camera);
    };

    const deepCloneMaterials = (obj: THREE.Object3D): THREE.Object3D => {
      const clone = obj.clone(true);
      clone.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(m => m.clone());
        else mesh.material = (mesh.material as THREE.Material).clone();
      });
      return clone;
    };

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath("/");
    mtlLoader.load("sword.mtl", (mats) => {
      mats.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mats);
      objLoader.setPath("/");
      objLoader.load("sword.obj", (obj) => {
        if (!mounted) return;
        obj.scale.setScalar(0.85);
        obj.rotation.z = -Math.PI / 10;
        obj.position.set(-14, 0, 0);
        leftSword = obj;
        scene.add(leftSword);

        rightSword = deepCloneMaterials(obj);
        rightSword.rotation.y = Math.PI;
        rightSword.rotation.z = Math.PI / 10;
        rightSword.position.set(14, 0, 0);
        scene.add(rightSword);

        animId = requestAnimationFrame(tick);
      });
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [show]);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

function SwordClash({ show }: { show: boolean }) {
  const [heartPhase, setHeartPhase] = useState<HeartPhase>("none");
  const handleHeart = useCallback((p: HeartPhase) => setHeartPhase(p), []);

  if (!show) return null;

  return (
    <div className="sword-stage">
      <Sword3DCanvas show={show} onHeart={handleHeart} />
      {heartPhase !== "none" && (
        <span className={`clash-heart${heartPhase === "out" ? " clash-heart-out" : ""}`}>♥</span>
      )}
    </div>
  );
}

/* ─── Messages on white screen ─── */
const MESSAGES = [
  "helen <3",
  "i hope you have the best day and a really happy happy happy birthday :)",
  "i wanted to make you something special this year,",
  "so i coded this little site just for you.",
  "thinking back to february in underground 2.0,",
  "i never imagined that one game would change everything for me",
  "from playing over and over to stalking people together,",
  "to making a discord server with friends",
  "thank you for being my favorite person.",
  "happy birthday i'm so glad i found you.",
];

interface TextState {
  msgIndex: number;
  opacity: number;
  scale: number;
  blur: number;
  transitioning: boolean;
}

const SWORD_AFTER = 4;  // show swords after message index 4
const SWORD_DUR   = 2800; // ms the sword animation occupies

function WhiteFlash({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [text, setText]           = useState<TextState>({ msgIndex: 0, opacity: 0, scale: 0.94, blur: 6, transitioning: false });
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [showSwords, setShowSwords]     = useState(false);
  const doneRef   = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!visible) return;
    const add = (fn: () => void, ms: number) => timersRef.current.push(setTimeout(fn, ms));

    setFlashOpacity(1);

    const FADE_IN = 800, HOLD = 3200, FADE_OUT = 900, GAP = 400;
    const MSG = FADE_IN + HOLD + FADE_OUT + GAP;

    MESSAGES.forEach((_, i) => {
      // Messages after the sword interlude are shifted by SWORD_DUR
      const extra = i > SWORD_AFTER ? SWORD_DUR : 0;
      const base  = 300 + i * MSG + extra;
      add(() => setText({ msgIndex: i, opacity: 1, scale: 1.02, blur: 0, transitioning: false }), base);
      add(() => setText({ msgIndex: i, opacity: 0, scale: 1.06, blur: 8, transitioning: true }),  base + FADE_IN + HOLD);
    });

    // Sword animation starts right when message 4's gap ends (= where msg 5 would start without offset)
    const swordStart = 300 + (SWORD_AFTER + 1) * MSG;
    add(() => setShowSwords(true),  swordStart);
    add(() => setShowSwords(false), swordStart + SWORD_DUR);

    const total = 300 + MESSAGES.length * MSG + SWORD_DUR;
    add(() => setFlashOpacity(0), total + 300);
    add(() => { if (!doneRef.current) { doneRef.current = true; onDone(); } }, total + 1400);

    return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div className="white-flash" style={{
      opacity: flashOpacity,
      transition: flashOpacity === 0 ? "opacity 1.1s ease" : "opacity 0.2s ease",
    }}>
      <SwordClash show={showSwords} />
      <p className="birthday-text" style={{
        opacity:    showSwords ? 0 : text.opacity,
        transform:  `scale(${text.scale})`,
        filter:     `blur(${text.blur}px)`,
        transition: "opacity 0.8s ease, transform 0.9s ease, filter 0.8s ease",
      }}>
        {MESSAGES[text.msgIndex]}
      </p>
    </div>
  );
}

/* ─── Fun button ─── */
function FunButton({ label, color }: { label: string; color: string }) {
  const [popped, setPopped] = useState(false);
  const tap = () => {
    setPopped(true);
    setTimeout(() => setPopped(false), 400);
  };
  return (
    <button
      className={`fun-btn${popped ? " fun-btn-pop" : ""}`}
      style={{ "--btn-color": color } as React.CSSProperties}
      onClick={tap}
    >
      {label}
    </button>
  );
}

/* ─── Polaroid card ─── */
function PolaroidCard({ src, caption, delay }: { src: string; caption: string; delay: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="polaroid fade-in-up" style={{ animationDelay: `${delay}s` }}>
      {loaded
        ? <img src={src} alt={caption} />
        : <div className="polaroid-placeholder">
            <span className="icon">📷</span>
            <span className="label">{src.replace(".jpg", "")}</span>
          </div>}
      <img src={src} alt="" style={{ display: "none" }}
        onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />
      <div className="polaroid-caption">{caption}</div>
    </div>
  );
}

function SecretPanel({
  open,
  onClose,
  onSkipIntro,
  onOpenCountdown,
  onOpenSecretChat,
  score,
  onTapMiniGame,
  introScope,
  onSetIntroScope,
}: {
  open: boolean;
  onClose: () => void;
  onSkipIntro: () => void;
  onOpenCountdown: () => void;
  onOpenSecretChat: () => void;
  score: number;
  onTapMiniGame: () => void;
  introScope: IntroScope;
  onSetIntroScope: (scope: IntroScope) => void;
}) {
  if (!open) return null;

  return (
    <div className="secret-panel-backdrop" onClick={onClose}>
      <div className="secret-panel" onClick={(e) => e.stopPropagation()}>
        <button className="secret-panel-close" onClick={onClose} aria-label="Close secret panel">
          ×
        </button>

        <p className="secret-panel-eyebrow">hidden access</p>
        <h2>mini-game control room</h2>
        <p className="secret-panel-text">only the chosen one gets this panel.</p>

        <div className="secret-panel-actions">
          <button className="secret-panel-btn primary" onClick={onSkipIntro}>skip intro</button>
          <button className="secret-panel-btn" onClick={onOpenCountdown}>open countdown</button>
          <button className="secret-panel-btn" onClick={onOpenSecretChat}>open secret chat</button>
        </div>

        <div className="secret-panel-scope">
          <p className="secret-panel-scope-title">skip intro for</p>
          <div className="secret-panel-scope-row">
            <button
              className={`secret-panel-btn ${introScope === "me" ? "active" : ""}`}
              onClick={() => onSetIntroScope("me")}
            >
              me
            </button>
            <button
              className={`secret-panel-btn ${introScope === "all" ? "active" : ""}`}
              onClick={() => onSetIntroScope("all")}
            >
              all
            </button>
          </div>
          <p className="secret-panel-scope-note">me = your browser only • all = shared default</p>
        </div>

        <div className="secret-panel-game">
          <p className="secret-panel-game-title">tiny admin mini-game</p>
          <button className="secret-panel-heart-btn" onClick={onTapMiniGame}>♥ tap me</button>
          <p className="secret-panel-game-score">score: {score}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function BirthdayGift() {
  const skipIntroQuery = new URLSearchParams(window.location.search).has("skip");
  const [stage, setStage] = useState<Stage>(skipIntroQuery || getStoredSkipIntroEnabled() ? "revealed" : "locked");
  const [password,  setPassword]  = useState("");
  const [shaking,   setShaking]   = useState(false);
  const [errorHint, setErrorHint] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [secretPanelOpen, setSecretPanelOpen] = useState(false);
  const [secretGameScore, setSecretGameScore] = useState(0);
  const secretSequenceRef = useRef("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [introScope, setIntroScope] = useState<IntroScope>(() => getStoredIntroScope());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.key === "Escape") {
        setSecretPanelOpen(false);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "s" && event.altKey && event.ctrlKey) {
        setSecretPanelOpen(true);
        return;
      }

      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "b", "a", "s", "k", "i", "p"].includes(key)) {
        secretSequenceRef.current = "";
        return;
      }

      const normalized = key === "arrowup" ? "u" : key === "arrowdown" ? "d" : key === "arrowleft" ? "l" : key === "arrowright" ? "r" : key;
      secretSequenceRef.current += normalized;

      if (secretSequenceRef.current.endsWith("skip")) {
        setSecretPanelOpen(true);
        secretSequenceRef.current = "";
        return;
      }

      if (secretSequenceRef.current.endsWith("uuddlrlrba")) {
        setSecretPanelOpen(true);
        secretSequenceRef.current = "";
        return;
      }

      if (secretSequenceRef.current.length > 20) {
        secretSequenceRef.current = secretSequenceRef.current.slice(-20);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPassword(val);
    setErrorHint("");

    if (val === "0310") {
      setAdminUnlocked(true);
      setSecretPanelOpen(true);
      setShowFlash(false);
      setErrorHint("admin access granted");
    } else if (val === "0308") {
      setShowFlash(true);
    } else if (val.length === 4) {
      setShaking(true);
      setErrorHint("not quite — try again");
      setTimeout(() => { setShaking(false); setPassword(""); }, 600);
    }
  }, []);

  const handleReveal = useCallback(() => {
    setStage("revealed");
    setShowFlash(false);
  }, []);

  const handleSetIntroScope = useCallback((scope: IntroScope) => {
    setIntroScope(scope);
    window.localStorage.setItem("birthday-skip-intro-scope", scope);
    window.localStorage.setItem("birthday-skip-intro-enabled", "true");

    if (scope === "all") {
      const url = new URL(window.location.href);
      url.searchParams.set("skip", "1");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("skip");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }

    setStage("revealed");
    setShowFlash(false);
    setSecretPanelOpen(false);
  }, []);

  const handleSkipIntro = useCallback(() => {
    setSecretPanelOpen(false);
    setShowFlash(false);
    setStage("revealed");
    window.localStorage.setItem("birthday-skip-intro-enabled", "true");
    window.localStorage.setItem("birthday-skip-intro-scope", introScope);
  }, [introScope]);

  const handleOpenCountdown = useCallback(() => {
    window.location.assign("/countdown");
  }, []);

  const handleOpenSecretChat = useCallback(() => {
    window.location.assign("/secret-chat");
  }, []);

  const handleMiniGameTap = useCallback(() => {
    setSecretGameScore((prev) => prev + 1);
  }, []);

  return (
    <>
      <SecretPanel
        open={secretPanelOpen}
        onClose={() => setSecretPanelOpen(false)}
        onSkipIntro={handleSkipIntro}
        onOpenCountdown={handleOpenCountdown}
        onOpenSecretChat={handleOpenSecretChat}
        score={secretGameScore}
        onTapMiniGame={handleMiniGameTap}
        introScope={introScope}
        onSetIntroScope={handleSetIntroScope}
      />
      <WhiteFlash visible={showFlash} onDone={handleReveal} />

      {/* ── Stage 1 ── */}
      {stage === "locked" && (
        <div className="stage-locked">
          <StarCanvas active />

          <div className="gift-wrapper">
            <span className={`gift-emoji${shaking ? " shake" : ""}`}>🎁</span>

            <p className="lock-title">a secret gift awaits you</p>

            <div className="password-form">
              <input
                className="password-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                value={password}
                onChange={handleChange}
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
              <p className="error-hint">{errorHint}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 3 ── */}
      {stage === "revealed" && (
        <div className="stage-reveal">

          {/* Hero */}
          <div className="hero-greeting fade-in-up">
            <p className="hero-sub">august 3rd</p>
            <h1 className="hero-name">Happy Birthday, Helen!</h1>
          </div>

          {/* Photos */}
          <section className="gallery-section">
            <p className="section-eyebrow">📸 moments</p>
            <h2>i want to remember</h2>
            <div className="polaroid-grid">
              <PolaroidCard src="photo1.jpg" caption="always"    delay={0.1} />
              <PolaroidCard src="photo2.jpg" caption="my fav"    delay={0.25} />
              <PolaroidCard src="photo3.jpg" caption="our story" delay={0.4} />
            </div>
          </section>

          {/* Fun buttons */}
          <section className="fun-section fade-in-up">
            <p className="section-eyebrow">💀 real ones know</p>
            <h2>things we both know</h2>
            <div className="fun-buttons-grid">
              {[
                { label: "pixi sucks 💀",               color: "#ff6b9d" },
                { label: "underground 2.0 changed everything 🎮", color: "#a78bfa" },
                { label: "doja cat > everyone 🎤",      color: "#f59e0b" },
                { label: "we are literally the same person 😭", color: "#34d399" },
                { label: "best stalking duo fr 🕵️",      color: "#60a5fa" },
              ].map((b, i) => (
                <FunButton key={i} label={b.label} color={b.color} />
              ))}
            </div>
          </section>

          {/* Reason cards */}
          <section className="reasons-section fade-in-up fade-in-up-delay-1">
            <p className="section-eyebrow">🌟 appreciation post</p>
            <h2>a few things</h2>
            <div className="reasons-grid">
              {[
                { emoji: "🎮", text: "that one game of underground 2.0 that started everything" },
                { emoji: "🕵️", text: "stalking people together like absolute detectives" },
                { emoji: "💬", text: "the discord server that turned into actual friendship" },
                { emoji: "🌟", text: "you're genuinely one of my favorite people" },
                { emoji: "🎤", text: "last but not least — putting up with me being obsessed with Doja Cat (Jealous type)" },
              ].map((r, i) => (
                <div className="reason-card" key={i}>
                  <span className="reason-emoji">{r.emoji}</span>
                  <p className="reason-text">{r.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Letter */}
          <section className="letter-section fade-in-up fade-in-up-delay-2">
            <h2>a little note</h2>
            <div className="letter-box">
              <div className="letter-date">August 3rd</div>
              <div className="letter-body">
                <p>
                  I didn't want to just send a boring text or a gift card so i spent
                  some time typing messin around with codes to make this for you (i got
                  some help but i did 90% of it and it's definitely not perfect as your
                  giftcard but I really wanted to build something personal for your
                  birthday cuz you mean a lot to me.
                </p>
                <p>I hope you have the best day today :)</p>
                <p>Happy Birthday &lt;3</p>
              </div>
              <span className="letter-signoff">Happy Birthday ♥</span>
            </div>
          </section>

          {/* Footer */}
          <footer className="reveal-footer">
            made with care, just for you
            <a href="/countdown" className="reveal-countdown-link">
              view the countdown →
            </a>
          </footer>

          <button className="floating-chat-launcher" onClick={() => setChatOpen(true)}>
            💬 chat
          </button>
          <ChatWidget open={chatOpen} onToggle={() => setChatOpen((prev) => !prev)} />
        </div>
      )}
    </>
  );
}
