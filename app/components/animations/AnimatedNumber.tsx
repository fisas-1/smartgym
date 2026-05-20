'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  style?: React.CSSProperties;
  mode?: 'tween' | 'slot';
  className?: string;
}

export default function AnimatedNumber({
  value,
  duration = 260,
  format,
  style,
  mode = 'tween',
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    if (mode === 'slot') {
      setDisplay(value);
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = display;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const shown = format ? format(display) : Math.round(display).toString();
  return <span style={style} className={className}>{shown}</span>;
}
