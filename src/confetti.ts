/** Confettis légers sur canvas — sans dépendance, respecte prefers-reduced-motion. */
export function launchConfetti(canvas: HTMLCanvasElement, colors: string[]): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  interface Particle {
    x: number; y: number; vx: number; vy: number;
    rot: number; vr: number; size: number; color: string;
  }

  const particles: Particle[] = Array.from({ length: 160 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.5,
    y: h * 0.35 + (Math.random() - 0.5) * h * 0.1,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 13 - 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    size: 5 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const t0 = performance.now();
  let last = t0;

  function frame(now: number): void {
    const dt = Math.min(32, now - last) / 16.7;
    last = now;

    ctx!.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.vy += 0.45 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }

    if (now - t0 < 3500) {
      requestAnimationFrame(frame);
    } else {
      ctx!.clearRect(0, 0, w, h);
    }
  }

  requestAnimationFrame(frame);
}
