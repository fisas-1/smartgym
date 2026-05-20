// ─────────────────────────────────────────────────────────────
// DOPAMINE — animated counters, confetti, taps, glow.
// ─────────────────────────────────────────────────────────────

// Animated number — tweens from prev → next on change
function AnimatedNumber({ value, duration = 260, format, style, mode = 'tween' }) {
  const [display, setDisplay] = React.useState(value);
  const rafRef = React.useRef(null);
  const fromRef = React.useRef(value);
  const startRef = React.useRef(0);

  React.useEffect(() => {
    if (mode === 'slot') {
      // Discrete slot machine: just jump with a brief scale
      setDisplay(value);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = performance.now();
    const target = value;
    const from = display;
    const dt = duration;
    const tick = (now) => {
      const p = Math.min(1, (now - startRef.current) / dt);
      // ease-out-cubic
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [value]);

  const shown = format ? format(display) : Math.round(display).toString();
  return <span style={style}>{shown}</span>;
}

// Slot-machine flip number — for single-digit reps
function FlipNumber({ value, style, color, prevColor }) {
  const [prev, setPrev] = React.useState(value);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (value !== prev) {
      setTick(t => t + 1);
      const id = setTimeout(() => setPrev(value), 220);
      return () => clearTimeout(id);
    }
  }, [value]);
  return (
    <span key={tick} style={{
      display: 'inline-block', position: 'relative',
      animation: 'dopFlip 280ms cubic-bezier(.34,1.56,.64,1) both',
      ...style,
    }}>{value}</span>
  );
}

// Confetti burst — emits N particles from origin
function Confetti({ active, x = '50%', y = '50%', colors = ['#B14E2C', '#FFD93D', '#5E8F3A', '#FFFFFF'], count = 24, onDone }) {
  const [parts, setParts] = React.useState([]);
  const idRef = React.useRef(0);
  React.useEffect(() => {
    if (!active) return;
    const newParts = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 90 + Math.random() * 60;
      newParts.push({
        id: idRef.current++,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 30,
        rot: (Math.random() - 0.5) * 720,
        color: colors[i % colors.length],
        delay: Math.random() * 80,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
    setParts(newParts);
    const tm = setTimeout(() => { setParts([]); onDone && onDone(); }, 1200);
    return () => clearTimeout(tm);
  }, [active]);
  if (!parts.length) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 50,
      width: 0, height: 0,
    }}>
      {parts.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          width: p.shape === 'rect' ? 8 : 6, height: p.shape === 'rect' ? 4 : 6,
          background: p.color, borderRadius: p.shape === 'circle' ? 999 : 1,
          '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`,
          animation: `dopConf 1100ms ${p.delay}ms cubic-bezier(.2,.6,.4,1) both`,
        }}/>
      ))}
    </div>
  );
}

// Sparkle bursts — soft outward spread of star sparks
function Sparkles({ active, color = '#FFD93D', count = 8 }) {
  const [parts, setParts] = React.useState([]);
  React.useEffect(() => {
    if (!active) return;
    const newParts = Array.from({length: count}, (_, i) => {
      const angle = (Math.PI * 2 * i) / count;
      return {
        id: i,
        dx: Math.cos(angle) * (40 + Math.random() * 30),
        dy: Math.sin(angle) * (40 + Math.random() * 30),
        rot: Math.random() * 360,
      };
    });
    setParts(newParts);
    const tm = setTimeout(() => setParts([]), 1000);
    return () => clearTimeout(tm);
  }, [active]);
  if (!parts.length) return null;
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none', zIndex: 49 }}>
      {parts.map(p => (
        <svg key={p.id} width="14" height="14" viewBox="0 0 14 14" style={{
          position: 'absolute',
          '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`,
          animation: 'dopSpark 800ms cubic-bezier(.2,.6,.4,1) both',
        }}>
          <path d="M7 0 L8.2 5.8 L14 7 L8.2 8.2 L7 14 L5.8 8.2 L0 7 L5.8 5.8 Z" fill={color}/>
        </svg>
      ))}
    </div>
  );
}

// Wraps a button to add tap-down scale animation
function TapScale({ children, onClick, disabled, style, scale = 0.94 }) {
  const ref = React.useRef(null);
  return (
    <div
      ref={ref}
      onPointerDown={() => {
        if (!ref.current || disabled) return;
        ref.current.style.transform = `scale(${scale})`;
      }}
      onPointerUp={() => {
        if (!ref.current) return;
        ref.current.style.transform = 'scale(1)';
      }}
      onPointerLeave={() => {
        if (!ref.current) return;
        ref.current.style.transform = 'scale(1)';
      }}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-block', transition: 'transform 120ms cubic-bezier(.34,1.36,.64,1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}>
      {children}
    </div>
  );
}

// Animated bar — fills in on mount with stagger
function AnimatedBar({ value, max, color, bg = 'transparent', height = 5, delay = 0, duration = 720 }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const id = setTimeout(() => setWidth((value / max) * 100), delay);
    return () => clearTimeout(id);
  }, [value, max, delay]);
  return (
    <div style={{ height, background: bg, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        height: '100%', width: `${width}%`, background: color,
        borderRadius: 999, transition: `width ${duration}ms cubic-bezier(.22,1,.36,1)`,
      }}/>
    </div>
  );
}

// Flame — animated streak indicator
function StreakFlame({ size = 16, color = '#FFD93D', intense }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: size,
      animation: `dopFlame ${intense ? 800 : 1400}ms ease-in-out infinite`,
      transformOrigin: 'bottom center',
      filter: intense ? `drop-shadow(0 0 6px ${color}66)` : 'none',
    }}>🔥</span>
  );
}

// Global keyframes
function DopamineStyles() {
  return (
    <style>{`
      @keyframes dopConf {
        0%   { transform: translate(0,0) rotate(0); opacity: 1; }
        70%  { opacity: 1; }
        100% { transform: translate(var(--dx), calc(var(--dy) + 80px)) rotate(var(--rot)); opacity: 0; }
      }
      @keyframes dopSpark {
        0%   { transform: translate(0,0) rotate(0) scale(0); opacity: 0; }
        20%  { transform: translate(calc(var(--dx) * 0.3), calc(var(--dy) * 0.3)) rotate(var(--rot)) scale(1); opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0); opacity: 0; }
      }
      @keyframes dopFlip {
        0%   { transform: translateY(-12px) scale(1.2); opacity: 0; }
        60%  { transform: translateY(2px)   scale(1);   opacity: 1; }
        100% { transform: translateY(0)     scale(1);   opacity: 1; }
      }
      @keyframes dopFlame {
        0%, 100% { transform: scale(1) rotate(-3deg); }
        50%      { transform: scale(1.1) rotate(3deg); }
      }
      @keyframes dopPulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color), 0 8px 20px var(--pulse-shadow); }
        50%      { box-shadow: 0 0 0 8px transparent,        0 8px 20px var(--pulse-shadow); }
      }
      @keyframes dopBreathe {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.015); }
      }
      @keyframes dopGlow {
        0%, 100% { box-shadow: 0 0 0 0 var(--glow), 0 8px 30px var(--glow); }
        50%      { box-shadow: 0 0 0 14px transparent, 0 14px 50px var(--glow); }
      }
      @keyframes dopSlideUp {
        from { transform: translateY(14px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes dopScalePop {
        0%   { transform: scale(0.85); opacity: 0; }
        60%  { transform: scale(1.06); }
        100% { transform: scale(1);    opacity: 1; }
      }
      @keyframes dopShake {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-3px); }
        75%      { transform: translateX(3px); }
      }
      @keyframes dopStarPop {
        0%   { transform: scale(0) rotate(0); opacity: 0; }
        50%  { transform: scale(1.4) rotate(180deg); opacity: 1; }
        100% { transform: scale(1) rotate(360deg); opacity: 1; }
      }
    `}</style>
  );
}

Object.assign(window, {
  AnimatedNumber, FlipNumber, Confetti, Sparkles, TapScale,
  AnimatedBar, StreakFlame, DopamineStyles,
});
