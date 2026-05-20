'use client';

import { useRef } from 'react';

interface TapScaleProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  scale?: number;
}

export default function TapScale({
  children,
  onClick,
  disabled,
  style,
  className,
  scale = 0.94,
}: TapScaleProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={className}
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
        display: 'inline-block',
        transition: 'transform 120ms cubic-bezier(.34,1.36,.64,1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
