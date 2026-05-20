'use client';

import { useState, useEffect } from 'react';

interface Spark {
  id: number;
  dx: number;
  dy: number;
  rot: number;
}

interface SparklesProps {
  active: boolean;
  color?: string;
  count?: number;
}

export default function Sparkles({ active, color = '#FFD93D', count = 8 }: SparklesProps) {
  const [parts, setParts] = useState<Spark[]>([]);

  useEffect(() => {
    if (!active) return;
    const newParts = Array.from({ length: count }, (_, i) => {
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
  }, [active, count]);

  if (!parts.length) return null;

  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none', zIndex: 49 }}>
      {parts.map(p => (
        <svg
          key={p.id}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          style={{
            position: 'absolute',
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animation: 'dopSpark 800ms cubic-bezier(.2,.6,.4,1) both',
          }}
        >
          <path d="M7 0 L8.2 5.8 L14 7 L8.2 8.2 L7 14 L5.8 8.2 L0 7 L5.8 5.8 Z" fill={color} />
        </svg>
      ))}
    </div>
  );
}
