import { useState, useEffect, useRef } from "react";

/* ── Floating stars background ── */
function useStars(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      o: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;
      stars.forEach(s => {
        const alpha = s.o * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,240,${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}

/* ── Rose petal shower (canvas) ── */
const PETAL_COLORS = [
  [255, 160, 190], [255, 130, 165], [240, 100, 150],
  [255, 190, 210], [220, 110, 155], [255, 200, 220],
];

function PetalCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const W = () => canvas.width  = window.innerWidth;
    const H = () => canvas.height = window.innerHeight;
    W(); H();
    window.addEventListener("resize", () => { W(); H(); });

    type Petal = {
      x: number; y: number;
      size: number; rot: number; rotSpeed: number;
      vx: number; vy: number;
      color: number[]; alpha: number; targetAlpha: number;
    };

    const makePetal = (fromTop = true): Petal => {
      const [r, g, b] = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      return {
        x: Math.random() * canvas.width,
        y: fromTop ? -20 - Math.random() * 200 : Math.random() * canvas.height,
        size: Math.random() * 7 + 5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        vx: (Math.random() - 0.5) * 0.9,
        vy: Math.random() * 1.2 + 0.6,
        color: [r, g, b],
        alpha: 0,
        targetAlpha: Math.random() * 0.45 + 0.3,
      };
    };

    const petals: Petal[] = Array.from({ length: 22 }, () => makePetal(false));
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach(p => {
        p.alpha += (p.targetAlpha - p.alpha) * 0.04;

        // Fade out near bottom
        const fadeDist = 80;
        if (p.y > canvas.height - fadeDist) {
          p.alpha *= 0.95;
        }

        p.x  += p.vx + Math.sin(p.y * 0.012) * 0.5;
        p.y  += p.vy;
        p.rot += p.rotSpeed;

        // Reset petal when it exits
        if (p.y > canvas.height + 30 || p.alpha < 0.01) {
          const fresh = makePetal(true);
          Object.assign(p, fresh);
        }

        // Draw petal as rotated ellipse
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.45);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
        const [r, g, b] = p.color;
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }}
    />
  );
}

/* ── Anniversary message reveal ── */
function AnniversaryReveal({ days }: { days: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={`anniv-reveal${visible ? " anniv-visible" : ""}`}>
      <p className="anniv-days">{days}</p>
      <p className="anniv-days-label">days together</p>

      <div className="anniv-divider">✦</div>

      <h1 className="anniv-title">Happy 1 year, my love ❤️</h1>

      <div className="anniv-letter">
        <p>
          I still think it's crazy how this all started.
        </p>
        <p>
          You came to me one day saying <em>"I want to tell you something"</em> and
          I was like what is it? Then you told me you used to like me and I said
          I used to like you too. And somehow that simple moment turned into us
          becoming us :)
        </p>
      </div>

      <p className="anniv-signoff">happy anniversary 🤍</p>

      <a href="/" className="cd-back" style={{ marginTop: "2rem" }}>← back to your gift</a>
    </div>
  );
}

/* ── Helpers ── */
const START_DATE = new Date(2025, 7, 16, 0, 0, 0);

function getDaysTogether() {
  return Math.floor((Date.now() - START_DATE.getTime()) / 86_400_000);
}

function getTarget() {
  const now  = new Date();
  const year = now.getMonth() > 7 || (now.getMonth() === 7 && now.getDate() > 16)
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, 7, 16, 0, 0, 0);
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/* ── Main page ── */
export default function Countdown() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useStars(canvasRef);

  const [diff,     setDiff]     = useState(() => getTarget().getTime() - Date.now());
  const [together, setTogether] = useState(() => getDaysTogether());

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(getTarget().getTime() - Date.now());
      setTogether(getDaysTogether());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const totalSecs = Math.max(0, Math.floor(diff / 1000));
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  const preview = new URLSearchParams(window.location.search).has("preview");
  const arrived = preview || totalSecs === 0;

  return (
    <div className="countdown-page">
      <canvas ref={canvasRef} className="particles-canvas" />
      <PetalCanvas active={arrived} />

      {arrived ? (
        <AnniversaryReveal days={together} />
      ) : (
        <div className="countdown-inner">
          <div className="together-block">
            <span className="together-num">{together}</span>
            <span className="together-label">days together</span>
          </div>

          <div className="cd-divider">✦</div>

          <p className="countdown-since">since august 16th</p>
          <h1 className="countdown-title">counting down to us</h1>

          <div className="countdown-grid">
            <div className="cd-cell">
              <span className="cd-num">{days}</span>
              <span className="cd-label">days</span>
            </div>
            <div className="cd-sep">:</div>
            <div className="cd-cell">
              <span className="cd-num">{pad(hours)}</span>
              <span className="cd-label">hours</span>
            </div>
            <div className="cd-sep">:</div>
            <div className="cd-cell">
              <span className="cd-num">{pad(mins)}</span>
              <span className="cd-label">minutes</span>
            </div>
            <div className="cd-sep">:</div>
            <div className="cd-cell">
              <span className="cd-num">{pad(secs)}</span>
              <span className="cd-label">seconds</span>
            </div>
          </div>

          <p className="countdown-sub">until one year with helen</p>
          <a href="/" className="cd-back">← back to your gift</a>
        </div>
      )}
    </div>
  );
}
