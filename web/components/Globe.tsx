'use client';

import { useEffect, useRef } from 'react';

type Vec3 = { x: number; y: number; z: number };

// Nodi = sedi server (coordinate reali di grandi città).
const NODES: { lat: number; lon: number }[] = [
  { lat: 40.71, lon: -74.0 }, // New York
  { lat: 51.51, lon: -0.13 }, // London
  { lat: 35.68, lon: 139.69 }, // Tokyo
  { lat: 1.35, lon: 103.82 }, // Singapore
  { lat: -33.87, lon: 151.21 }, // Sydney
  { lat: 52.52, lon: 13.4 }, // Berlin
  { lat: 37.77, lon: -122.42 }, // San Francisco
  { lat: 19.43, lon: -99.13 }, // Mexico City
  { lat: -23.55, lon: -46.63 }, // Sao Paulo
  { lat: 55.75, lon: 37.62 }, // Moscow
  { lat: 28.61, lon: 77.21 }, // New Delhi
  { lat: 25.2, lon: 55.27 }, // Dubai
];

// Coppie di nodi collegate da un "tunnel" animato.
const ARC_PAIRS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [6, 0], [4, 3], [8, 0], [5, 10], [11, 2], [9, 1],
];

function toVec(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: Math.cos(lat) * Math.sin(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.cos(lon),
  };
}

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const w0 = Math.sin((1 - t) * omega) / s;
  const w1 = Math.sin(t * omega) / s;
  return { x: a.x * w0 + b.x * w1, y: a.y * w0 + b.y * w1, z: a.z * w0 + b.z * w1 };
}

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, R = 0, cx = 0, cy = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * 0.42;
      cx = w / 2;
      cy = h / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tilt = (23 * Math.PI) / 180;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    // Rotazione attorno all'asse Y, poi inclinazione attorno all'asse X.
    const transform = (v: Vec3, rot: number): Vec3 => {
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const x = v.x * cosR + v.z * sinR;
      const z0 = -v.x * sinR + v.z * cosR;
      const y = v.y;
      const y2 = y * cosT - z0 * sinT;
      const z2 = y * sinT + z0 * cosT;
      return { x, y: y2, z: z2 };
    };

    // z in [-1,1] -> opacità (fronte luminoso, retro attenuato).
    const depthAlpha = (z: number, front = 0.85, back = 0.07) => {
      const t = (z + 1) / 2;
      return back + (front - back) * t;
    };

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const time = (now - start) / 1000;
      const rot = reduceMotion ? 0.6 : time * 0.16;

      ctx.clearRect(0, 0, w, h);

      // Alone luminoso dietro al globo.
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.65);
      halo.addColorStop(0, 'rgba(130,170,255,0.06)');
      halo.addColorStop(0.55, 'rgba(130,170,255,0.02)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.lineCap = 'round';

      // Paralleli.
      for (let lat = -80; lat <= 80; lat += 20) {
        let prev: { x: number; y: number; z: number } | null = null;
        for (let lon = 0; lon <= 360; lon += 9) {
          const p = transform(toVec(lat, lon), rot);
          const sx = cx + p.x * R;
          const sy = cy - p.y * R;
          if (prev) {
            const z = (p.z + prev.z) / 2;
            ctx.strokeStyle = `rgba(200,212,240,${depthAlpha(z).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
          prev = { x: sx, y: sy, z: p.z };
        }
      }

      // Meridiani.
      for (let lon = 0; lon < 360; lon += 30) {
        let prev: { x: number; y: number; z: number } | null = null;
        for (let lat = -90; lat <= 90; lat += 6) {
          const p = transform(toVec(lat, lon), rot);
          const sx = cx + p.x * R;
          const sy = cy - p.y * R;
          if (prev) {
            const z = (p.z + prev.z) / 2;
            ctx.strokeStyle = `rgba(200,212,240,${depthAlpha(z).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
          prev = { x: sx, y: sy, z: p.z };
        }
      }

      // Archi (tunnel VPN) con impulso in movimento.
      for (let i = 0; i < ARC_PAIRS.length; i++) {
        const [a, b] = ARC_PAIRS[i];
        const va = toVec(NODES[a].lat, NODES[a].lon);
        const vb = toVec(NODES[b].lat, NODES[b].lon);
        const SEG = 44;
        let prev: { x: number; y: number; z: number } | null = null;
        for (let s = 0; s <= SEG; s++) {
          const t = s / SEG;
          const m = slerp(va, vb, t);
          const lift = 1 + 0.34 * Math.sin(Math.PI * t);
          const p = transform({ x: m.x * lift, y: m.y * lift, z: m.z * lift }, rot);
          const sx = cx + p.x * R;
          const sy = cy - p.y * R;
          if (prev) {
            const z = (p.z + prev.z) / 2;
            ctx.strokeStyle = `rgba(160,196,255,${depthAlpha(z, 0.5, 0.03).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
          prev = { x: sx, y: sy, z: p.z };
        }
        const head = reduceMotion ? 0.5 : (time * 0.22 + i * 0.37) % 1;
        const m = slerp(va, vb, head);
        const lift = 1 + 0.34 * Math.sin(Math.PI * head);
        const p = transform({ x: m.x * lift, y: m.y * lift, z: m.z * lift }, rot);
        if (p.z > -0.1) {
          const sx = cx + p.x * R;
          const sy = cy - p.y * R;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
          g.addColorStop(0, 'rgba(228,242,255,0.95)');
          g.addColorStop(1, 'rgba(160,196,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Nodi (solo quelli sulla faccia visibile).
      for (const n of NODES) {
        const p = transform(toVec(n.lat, n.lon), rot);
        if (p.z <= 0) continue;
        const sx = cx + p.x * R;
        const sy = cy - p.y * R;
        ctx.fillStyle = `rgba(240,248,255,${depthAlpha(p.z, 1, 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.7, 0, Math.PI * 2);
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

  return <canvas ref={canvasRef} className="globe-canvas" aria-hidden="true" />;
}
