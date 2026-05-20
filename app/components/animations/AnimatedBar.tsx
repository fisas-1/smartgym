'use client';

import { useState, useEffect } from 'react';

interface AnimatedBarProps {
  value: number;
  max: number;
  color: string;
  bg?: string;
  height?: number;
  delay?: number;
  duration?: number;
  className?: string;
}

export default function AnimatedBar({
  value,
  max,
  color,
  bg = 'transparent',
  height = 5,
  delay = 0,
  duration = 720,
  className,
}: AnimatedBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setWidth((value / max) * 100), delay);
    return () => clearTimeout(id);
  }, [value, max, delay]);

  return (
    <div
      className={className}
      style={{ height, background: bg, borderRadius: 999, overflow: 'hidden', position: 'relative' }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: color,
          borderRadius: 999,
          transition: `width ${duration}ms cubic-bezier(.22,1,.36,1)`,
        }}
      />
    </div>
  );
}
