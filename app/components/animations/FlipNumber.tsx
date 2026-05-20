'use client';

import { useState, useEffect } from 'react';

interface FlipNumberProps {
  value: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export default function FlipNumber({ value, style, className }: FlipNumberProps) {
  const [prev, setPrev] = useState(value);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (value !== prev) {
      setTick(t => t + 1);
      const id = setTimeout(() => setPrev(value), 220);
      return () => clearTimeout(id);
    }
  }, [value, prev]);

  return (
    <span
      key={tick}
      className={className}
      style={{
        display: 'inline-block',
        position: 'relative',
        animation: 'dopFlip 280ms cubic-bezier(.34,1.56,.64,1) both',
        ...style,
      }}
    >
      {value}
    </span>
  );
}
