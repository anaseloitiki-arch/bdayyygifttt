import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type Stage = "locked" | "flash" | "revealed";

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

/* ─── Main component ─── */
export default function BirthdayGift() {
  const skipIntro = new URLSearchParams(window.location.search).has("skip");
  const [stage,     setStage]     = useState<Stage>(skipIntro ? "revealed" : "locked");
  const [password,  setPassword]  = useState("");
  const [shaking,   setShaking]   = useState(false);
  const [errorHint, setErrorHint] = useState("");
  const [showFlash, setShowFlash] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPassword(val);
    setErrorHint("");

    if (val === "0308") {
      setShowFlash(true);
    } else if (val.length === 4) {
      setShaking(true);
      setErrorHint("not quite — try again");
      setTimeout(() => { setShaking(false); setPassword(""); }, 600);
    }
  }, []);

  const handleReveal = useCallback(() => setStage("revealed"), []);

  return (
    <>
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
            <h2>moments i want to remember</h2>
            <div className="polaroid-grid">
              <PolaroidCard src="photo1.jpg" caption="always"    delay={0.1} />
              <PolaroidCard src="photo2.jpg" caption="my fav"    delay={0.25} />
              <PolaroidCard src="photo3.jpg" caption="our story" delay={0.4} />
            </div>
          </section>

          {/* Reason cards */}
          <section className="reasons-section fade-in-up fade-in-up-delay-1">
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
        </div>
      )}
    </>
  );
}
