import { useEffect, useRef, useState, type VideoHTMLAttributes } from "react";

/* ---------- small inline icons ---------- */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const PlugIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2" aria-hidden="true">
    <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />
  </svg>
);
export const ClockIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const LeafIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2" aria-hidden="true">
    <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14zM5 19l7-7" />
  </svg>
);
export const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2" aria-hidden="true">
    <path d="M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </svg>
);
export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </svg>
);
export const TickIcon = () => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="3" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

/* ---------- muted looping video that plays only while on screen ---------- */
type AutoVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  eager?: boolean;
};

export function AutoVideo({ src, eager, className, ...rest }: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    const play = () => {
      if (!v.getAttribute("src")) v.setAttribute("src", src);
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible) play();
        else v.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    // Low Power Mode on iPhone blocks autoplay until the first touch; retry then.
    const unlock = () => {
      if (visible && v.paused) play();
    };
    const evs = ["touchstart", "click", "scroll"] as const;
    evs.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    return () => {
      io.disconnect();
      evs.forEach((ev) => window.removeEventListener(ev, unlock));
    };
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      {...(eager ? { src } : {})}
      {...rest}
    />
  );
}

/* ---------- procedural before/after carpet slider ---------- */
const hash = (i: number, j: number) => {
  let n = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

export function BeforeAfter() {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const layers = useRef<{ clean: HTMLCanvasElement; dirty: HTMLCanvasElement } | null>(null);
  const [pos, setPos] = useState(52);
  const posRef = useRef(pos);
  posRef.current = pos;

  const draw = (p: number) => {
    const c = cv.current,
      l = layers.current;
    if (!c || !l) return;
    const ctx = c.getContext("2d")!;
    const W = c.width,
      H = c.height,
      xp = Math.round((W * p) / 100);
    ctx.drawImage(l.dirty, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(xp, 0, W - xp, H);
    ctx.clip();
    ctx.drawImage(l.clean, 0, 0);
    ctx.restore();
  };

  useEffect(() => {
    const build = () => {
      const b = box.current,
        c = cv.current;
      if (!b || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(b.clientWidth * dpr),
        H = Math.round(b.clientHeight * dpr);
      if (!W || !H) return;
      c.width = W;
      c.height = H;
      const c1 = document.createElement("canvas"),
        c2 = document.createElement("canvas");
      c1.width = c2.width = W;
      c1.height = c2.height = H;
      const a = c1.getContext("2d")!.createImageData(W, H),
        d2 = c2.getContext("2d")!.createImageData(W, H);
      const cell = Math.max(3, Math.round(3.2 * dpr));
      const stains: [number, number, number, number, number][] = [
        [0.3, 0.3, 0.1, 7, 1.1],
        [0.62, 0.62, 0.075, 5, 2.3],
        [0.22, 0.74, 0.06, 6, 0.4],
        [0.78, 0.2, 0.05, 4, 3.1],
        [0.48, 0.46, 0.035, 5, 1.7],
      ];
      const base: [number, number, number] = [228, 221, 206];
      for (let y = 0; y < H; y++) {
        const row = Math.floor(y / cell),
          off = (row % 2) * Math.floor(cell / 2);
        for (let x = 0; x < W; x++) {
          const col = Math.floor((x + off) / cell);
          const t = hash(col, row) * 2 - 1,
            n = hash(x, y + 7919) * 2 - 1;
          const cx = ((x + off) % cell) / cell - 0.5,
            cy = (y % cell) / cell - 0.5,
            hl = 1 - Math.min(1, (cx * cx + cy * cy) * 3.2);
          const k = 0.86 + 0.07 * t + 0.05 * n + 0.1 * hl;
          const i = (y * W + x) * 4;
          const r = base[0] * k,
            g = base[1] * k,
            bl = base[2] * k;
          a.data[i] = r;
          a.data[i + 1] = g;
          a.data[i + 2] = bl;
          a.data[i + 3] = 255;
          const u = x / W,
            v = y / H;
          const dd = Math.abs(u - (1 - v) * 0.9 - 0.05) / 0.22;
          const lane = Math.exp(-dd * dd) * 0.3;
          let s = 0;
          for (const [sx, sy, sr, lobes, ph] of stains) {
            const dx = u - sx,
              dy = (v - sy) * (H / W),
              dist = Math.sqrt(dx * dx + dy * dy),
              ang = Math.atan2(dy, dx);
            const re =
              sr *
              (1 +
                0.1 * Math.sin(lobes * ang + ph) +
                0.07 * Math.sin(3 * ang + ph * 1.7) +
                0.04 * Math.sin(11 * ang + ph * 2.3) +
                0.06 * (hash(Math.round(ang * 9), lobes) - 0.5));
            const e = 1 - dist / re;
            if (e > 0) s = Math.max(s, Math.min(1, e * 2.2) * (0.42 + 0.3 * (1 - e)));
          }
          const dull = 0.8 - lane;
          let R = r * dull * 0.97,
            G = g * dull * 0.92,
            B = bl * dull * 0.82;
          R = R * (1 - s) + (112 + 20 * n) * s;
          G = G * (1 - s) + (84 + 16 * n) * s;
          B = B * (1 - s) + (52 + 12 * n) * s;
          d2.data[i] = R;
          d2.data[i + 1] = G;
          d2.data[i + 2] = B;
          d2.data[i + 3] = 255;
        }
      }
      c1.getContext("2d")!.putImageData(a, 0, 0);
      c2.getContext("2d")!.putImageData(d2, 0, 0);
      layers.current = { clean: c1, dirty: c2 };
      draw(posRef.current);
    };
    build();
    let tm: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(tm);
      tm = setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(tm);
    };
  }, []);

  useEffect(() => {
    draw(pos);
  }, [pos]);

  return (
    <div>
      <div className="ba" ref={box}>
        <canvas ref={cv} aria-hidden="true" />
        <span className="tag b">BEFORE</span>
        <span className="tag a">AFTER</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Drag to compare carpet before and after cleaning"
        />
        <div className="divider" style={{ left: `${pos}%` }}>
          <div className="handle">
            <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true">
              <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
            </svg>
          </div>
        </div>
        <div className="stamp">
          <b>1–3 hrs</b>
          <span>
            typical dry time
            <br />
            after low-moisture cleaning
          </span>
        </div>
      </div>
      <p className="ba-caption">Illustration. Drag the handle to compare.</p>
    </div>
  );
}

/* ---------- where the visitor came from (for knowing which posts and ads work) ---------- */
export function getLeadSource(): string {
  if (typeof window === "undefined") return "";
  try {
    const KEY = "ss_source";
    const saved = sessionStorage.getItem(KEY);
    if (saved) return saved;
    const p = new URLSearchParams(window.location.search);
    const utm = ["utm_source", "utm_medium", "utm_campaign"]
      .map((k) => p.get(k))
      .filter(Boolean)
      .join(" / ");
    const ref =
      document.referrer && !document.referrer.includes(window.location.host)
        ? document.referrer
        : "";
    const src = utm || ref || "direct";
    sessionStorage.setItem(KEY, src);
    return src;
  } catch {
    return "";
  }
}
