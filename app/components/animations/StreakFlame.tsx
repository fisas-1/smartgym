'use client';

interface StreakFlameProps {
  size?: number;
  color?: string;
  intense?: boolean;
}

export default function StreakFlame({ size = 16, color = '#FFD93D', intense }: StreakFlameProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: size,
        animation: `dopFlame ${intense ? 800 : 1400}ms ease-in-out infinite`,
        transformOrigin: 'bottom center',
        filter: intense ? `drop-shadow(0 0 6px ${color}66)` : 'none',
      }}
    >
      🔥
    </span>
  );
}
