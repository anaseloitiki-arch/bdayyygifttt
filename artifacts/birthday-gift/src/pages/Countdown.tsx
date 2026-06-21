import { useState, useEffect, useRef } from "react";

function useStars(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
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

function getTarget() {
  const now  = new Date();
  const year = now.getMonth() > 7 || (now.getMonth() === 7 && now.getDate() > 16)
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, 7, 16, 0, 0, 0);
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function Countdown() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useStars(canvasRef);

  const [diff, setDiff] = useState(() => getTarget().getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setDiff(getTarget().getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSecs = Math.max(0, Math.floor(diff / 1000));
  const days      = Math.floor(totalSecs / 86400);
  const hours     = Math.floor((totalSecs % 86400) / 3600);
  const mins      = Math.floor((totalSecs % 3600) / 60);
  const secs      = totalSecs % 60;

  const arrived = totalSecs === 0;

  return (
    <div className="countdown-page">
      <canvas ref={canvasRef} className="particles-canvas" />

      <div className="countdown-inner">
        <p className="countdown-since">since august 16th</p>
        <h1 className="countdown-title">
          {arrived ? "happy anniversary 🤍" : "counting down to us"}
        </h1>

        {!arrived && (
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
        )}

        {arrived && (
          <p className="countdown-arrived">
            today is the day ♥
          </p>
        )}

        <p className="countdown-sub">
          until one year with helen
        </p>

        <a href="/" className="cd-back">← back to your gift</a>
      </div>
    </div>
  );
}
