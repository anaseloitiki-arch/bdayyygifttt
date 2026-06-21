import { useState, useEffect, useRef, useCallback } from "react";

type Stage = "locked" | "flash" | "revealed";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  hue: number;
  speed: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  width: number;
  height: number;
  opacity: number;
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 90;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      hue: Math.random() * 60 + 270,
      speed: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        grad.addColorStop(0, `hsla(${p.hue}, 90%, 80%, ${p.opacity})`);
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 60%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 70%, ${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
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

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#ff6eb4", "#ff3d9a", "#ff8ecf", "#ffd6ec",
      "#c77dff", "#9b59b6", "#e040fb", "#f48fb1",
      "#ffb347", "#ffd700", "#ff6b6b", "#4ecdc4",
      "#fff", "#ffe4e1",
    ];

    const burst = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        piecesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 6,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          color: colors[Math.floor(Math.random() * colors.length)],
          width: Math.random() * 10 + 5,
          height: Math.random() * 5 + 3,
          opacity: 1,
        });
      }
    };

    const w = canvas.width;
    const h = canvas.height;
    burst(w / 2, h / 2, 180);
    burst(w * 0.2, h * 0.3, 80);
    burst(w * 0.8, h * 0.3, 80);
    burst(w * 0.1, h * 0.6, 60);
    burst(w * 0.9, h * 0.6, 60);

    const extraBursts = setInterval(() => {
      burst(Math.random() * w, Math.random() * h * 0.5, 40);
    }, 300);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pieces = piecesRef.current;
      const alive: ConfettiPiece[] = [];

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.006;

        if (p.opacity <= 0 || p.y > canvas.height + 40) continue;
        alive.push(p);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }

      piecesRef.current = alive;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(extraBursts);
    };
  }, [active, canvasRef]);
}

function ParticleCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useParticles(ref, active);
  return <canvas ref={ref} className="particles-canvas" />;
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useConfetti(ref, active);
  return <canvas ref={ref} className="confetti-canvas" />;
}

const MESSAGES = [
  "helen <3",
  "i hope you have the best day and a really happy happy happy birthday :)",
  "i'm still learning to code but i wanted to try making this for your birthday",
];

interface TextState {
  msgIndex: number;
  opacity: number;
  scale: number;
  blur: number;
  transitioning: boolean;
}

function WhiteFlash({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const [textState, setTextState] = useState<TextState>({
    msgIndex: 0,
    opacity: 0,
    scale: 0.88,
    blur: 8,
    transitioning: false,
  });
  const [flashOpacity, setFlashOpacity] = useState(0);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!visible) return;

    const add = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    setFlashOpacity(1);

    // Helper: show message at msgIndex starting at `startMs`
    // returns when the message finishes fading out
    const FADE_IN = 800;
    const HOLD = 3200;
    const FADE_OUT = 900;
    const GAP = 400;
    const MSG_TOTAL = FADE_IN + HOLD + FADE_OUT + GAP;

    MESSAGES.forEach((_, i) => {
      const base = 300 + i * MSG_TOTAL;

      // fade in
      add(() => {
        setTextState({ msgIndex: i, opacity: 1, scale: 1.04, blur: 0, transitioning: false });
      }, base);

      // fade out
      add(() => {
        setTextState({ msgIndex: i, opacity: 0, scale: 1.1, blur: 10, transitioning: true });
      }, base + FADE_IN + HOLD);
    });

    const totalDuration = 300 + MESSAGES.length * MSG_TOTAL;

    // White fades out
    add(() => setFlashOpacity(0), totalDuration + 200);

    // Reveal stage 3
    add(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, totalDuration + 1200);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      className="white-flash"
      style={{
        opacity: flashOpacity,
        transition: flashOpacity === 0 ? "opacity 1s ease" : "opacity 0.2s ease",
      }}
    >
      <p
        className="birthday-text"
        style={{
          opacity: textState.opacity,
          transform: `scale(${textState.scale})`,
          filter: `blur(${textState.blur}px)`,
          transition: textState.transitioning
            ? "opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease"
            : "opacity 0.7s ease, transform 0.8s ease, filter 0.7s ease",
        }}
      >
        {MESSAGES[textState.msgIndex]}
      </p>
    </div>
  );
}

function PolaroidCard({
  src,
  caption,
  delay,
}: {
  src: string;
  caption: string;
  delay: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`polaroid fade-in-up`}
      style={{ animationDelay: `${delay}s` }}
    >
      {loaded ? (
        <img src={src} alt={caption} onError={() => setLoaded(false)} />
      ) : (
        <div className="polaroid-placeholder">
          <span className="icon">📷</span>
          <span className="label">{src.replace(".jpg", "")}</span>
        </div>
      )}
      <img
        src={src}
        alt={caption}
        style={{ display: "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
      <div className="polaroid-caption">{caption}</div>
    </div>
  );
}

export default function BirthdayGift() {
  const [stage, setStage] = useState<Stage>("locked");
  const [password, setPassword] = useState("");
  const [shaking, setShaking] = useState(false);
  const [errorHint, setErrorHint] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
      setPassword(val);
      setErrorHint("");

      if (val === "0308") {
        // Correct! Start sequence
        setShowConfetti(true);
        setTimeout(() => setShowFlash(true), 60);
      } else if (val.length === 4) {
        // Wrong
        setShaking(true);
        setErrorHint("That's not quite it... try again 💫");
        setTimeout(() => {
          setShaking(false);
          setPassword("");
        }, 600);
      }
    },
    []
  );

  const handleReveal = useCallback(() => {
    setStage("revealed");
  }, []);

  return (
    <>
      {/* Confetti layer — always mounted when triggered */}
      <ConfettiCanvas active={showConfetti} />

      {/* White flash + text animation */}
      <WhiteFlash visible={showFlash} onDone={handleReveal} />

      {/* Stage 1: Locked */}
      {stage === "locked" && (
        <div className="stage-locked">
          <ParticleCanvas active={stage === "locked"} />

          <div className="gift-wrapper">
            <span className={`gift-emoji${shaking ? " shake" : ""}`}>🎁</span>

            <div style={{ textAlign: "center" }}>
              <p className="lock-title">A secret gift awaits you</p>
            </div>

            <div className="password-form">
              <input
                className="password-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                value={password}
                onChange={handlePasswordChange}
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
              <p className="error-hint">{errorHint}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: Revealed */}
      {stage === "revealed" && (
        <div className="stage-reveal">
          {/* Header */}
          <header className="reveal-header fade-in-up">
            <p className="subtitle">
              <span className="heart-deco">♥</span>
              <span className="heart-deco">♥</span>
              <span className="heart-deco">♥</span>
            </p>
            <h1>August 3rd &bull; Your Special Day</h1>
          </header>

          {/* Photo Gallery */}
          <section className="gallery-section">
            <h2>Moments I treasure most</h2>
            <div className="polaroid-grid">
              <PolaroidCard src="photo1.jpg" caption="Us, always" delay={0.1} />
              <PolaroidCard src="photo2.jpg" caption="My favorite smile" delay={0.25} />
              <PolaroidCard src="photo3.jpg" caption="Our story" delay={0.4} />
            </div>
          </section>

          {/* Letter */}
          <section className="letter-section">
            <h2>A letter, from my heart to yours</h2>
            <div className="letter-box fade-in-up fade-in-up-delay-2">
              <div className="letter-date">August 3rd</div>
              <div className="letter-body">
                <p>
                  My love, on this very special day, I want you to know that every
                  single morning I wake up grateful — grateful that you exist, that
                  you chose me, that I get to call you mine.
                </p>
                <p>
                  You bring warmth into every room you walk into. Your laugh is my
                  favorite sound in the world. The way you care for the people around
                  you makes me fall in love with you more every day.
                </p>
                <p>
                  Today I celebrate not just your birthday, but every moment that made
                  you who you are — every laugh, every late night conversation, every
                  quiet afternoon that somehow became my favorite memory.
                </p>
                <p>
                  You deserve all the joy this world has to offer. I'll spend every
                  day doing my best to make sure you feel just how loved you truly are.
                </p>
                <p>
                  Happy birthday, my heart. Today, tomorrow, and always —
                </p>
              </div>
              <span className="letter-signoff">Yours, forever ♥</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
