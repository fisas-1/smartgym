'use client';

import { useState, useEffect, useRef } from 'react';

interface Particle {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  delay: number;
  shape: 'rect' | 'circle';
}

interface ConfettiProps {
  active: boolean;
  x?: string;
  y?: string;
  colors?: string[];
  count?: number;
  onDone?: () => void;
}

export default function Confetti({
  active,
  x = '50%',
  y = '50%',
  colors = ['#B14E2C', '#FFD93D', '#5E8F3A', '#FFFFFF'],
  count = 24,
  onDone,
}: ConfettiProps) {
  const [parts, setParts] = useState<Particle[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const newParts: Particle[] = [];
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
    const tm = setTimeout(() => { setParts([]); onDone?.(); }, 1200);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!parts.length) return null;

  return (
    <div style={{
      position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 50,
      width: 0, height: 0,
    }}>
      {parts.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.shape === 'rect' ? 8 : 6,
            height: p.shape === 'rect' ? 4 : 6,
            background: p.color,
            borderRadius: p.shape === 'circle' ? 999 : 1,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animation: `dopConf 1100ms ${p.delay}ms cubic-bezier(.2,.6,.4,1) both`,
          }}
        />
      ))}
    </div>
  );
}
