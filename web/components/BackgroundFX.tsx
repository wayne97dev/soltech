'use client';

import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; r: number; a: number; tw: number; vx: number };
type Glow = { x: number; y: number; r: number; vx: number; vy: number; c: string };

export default function BackgroundFX() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let stars: Star[] = [];
    let glows: Glow[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(180, Math.floor((w * h) / 11000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.4, 1.5),
        a: rand(0.18, 0.8),
        tw: rand(0.4, 1.6),
        vx: rand(-0.045, 0.045),
      }));
      glows = [
        { x: w * 0.22, y: h * 0.28, r: Math.max(w, h) * 0.4, vx: rand(-0.05, 0.05), vy: rand(-0.03, 0.03), c: 'rgba(70,110,220,0.05)' },
        { x: w * 0.82, y: h * 0.72, r: Math.max(w, h) * 0.34, vx: rand(-0.05, 0.05), vy: rand(-0.03, 0.03), c: 'rgba(120,90,230,0.045)' },
      ];
    };
    init();
    const ro = new ResizeObserver(init);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const g of glows) {
        if (!reduce) {
          g.x += g.vx;
          g.y += g.vy;
          if (g.x < 0 || g.x > w) g.vx *= -1;
          if (g.y < 0 || g.y > h) g.vy *= -1;
        }
        const rg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        rg.addColorStop(0, g.c);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      }

      for (const s of stars) {
        if (!reduce) {
          s.x += s.vx;
          if (s.x < 0) s.x += w;
          if (s.x > w) s.x -= w;
        }
        const a = s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.x));
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
