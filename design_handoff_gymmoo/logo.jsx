// ─────────────────────────────────────────────────────────────
// LOGOTYPE SYSTEM · gymmoo
// 5 typographic concepts — no drawings, just letterforms + accent.
// ─────────────────────────────────────────────────────────────

const LOGO_FONT = '"Geist", system-ui, sans-serif';
const LOGO_MONO = '"Geist Mono", ui-monospace, monospace';

// ── 1 · MOOOO — elongated 'oo' visually holding the cow sound
//    The double-o stretches into a long held note. Pure type, custom letter-spacing.
function LogoStretched({ size = 64, color = '#1A1815', accent = '#B14E2C', stretched = 'mmm' }) {
  // We draw a custom O made of thin horizontal ovals to suggest the held sound
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: LOGO_FONT, fontSize: size, fontWeight: 600, color,
      letterSpacing: '-0.04em', lineHeight: 1,
    }}>
      <span>gym</span>
      {/* The 'mooo' has stretched o's — each o becomes increasingly wide */}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <span>m</span>
        {/* First o — normal width */}
        <span style={{ display: 'inline-block', width: size * 0.55, position: 'relative' }}>
          <svg viewBox="0 0 60 60" width={size * 0.55} height={size * 0.78} style={{ display: 'block' }}>
            <ellipse cx="30" cy="30" rx="24" ry="22" fill="none" stroke={color} strokeWidth="10"/>
          </svg>
        </span>
        {/* Second o — wider */}
        <span style={{ display: 'inline-block', width: size * 0.85, marginLeft: -size * 0.08, position: 'relative' }}>
          <svg viewBox="0 0 90 60" width={size * 0.85} height={size * 0.78} style={{ display: 'block' }}>
            <ellipse cx="45" cy="30" rx="40" ry="22" fill="none" stroke={color} strokeWidth="10"/>
          </svg>
        </span>
      </span>
      <span style={{ color: accent }}>.</span>
    </div>
  );
}

// ── 2 · GYM.MOO. — domain-style with mid-dot + closing accent dot
//    Reads as "gym dot moo dot" — modern, tech-y, instantly readable.
function LogoDomain({ size = 64, color = '#1A1815', accent = '#B14E2C' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'baseline',
      fontFamily: LOGO_FONT, fontSize: size, fontWeight: 600, color,
      letterSpacing: '-0.035em', lineHeight: 1,
    }}>
      <span style={{ opacity: 0.7 }}>gym</span>
      <span style={{ color: accent, padding: `0 ${size * 0.03}px`, fontWeight: 700 }}>.</span>
      <span>moo</span>
      <span style={{ color: accent, fontWeight: 700 }}>.</span>
    </div>
  );
}

// ── 3 · BARBELL O — one of the o's has a barbell through it (still pure letterform feel)
//    Subtle gym reference inside the type.
function LogoBarbell({ size = 64, color = '#1A1815', accent = '#B14E2C' }) {
  const s = size;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: LOGO_FONT, fontSize: s, fontWeight: 600, color,
      letterSpacing: '-0.04em', lineHeight: 1, position: 'relative',
    }}>
      <span>gymm</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>oo</span>
      {/* Barbell line through the second o */}
      <svg
        viewBox="0 0 120 30"
        style={{
          position: 'absolute',
          right: `${s * 0.32}px`,
          top: '50%', transform: 'translateY(-50%)',
          width: s * 1.7, height: s * 0.4, pointerEvents: 'none',
        }}>
        {/* Bar */}
        <rect x="6" y="13" width="108" height="4" rx="2" fill={accent}/>
        {/* Plates */}
        <rect x="0" y="6" width="6" height="18" rx="2" fill={accent}/>
        <rect x="114" y="6" width="6" height="18" rx="2" fill={accent}/>
      </svg>
      <span style={{ color: accent, position: 'relative', zIndex: 2 }}>.</span>
    </div>
  );
}

// ── 4 · MOO. — short form, drops "gym" entirely as a primary mark
//    "moo." is the brand essence. The "gymmoo" wordmark is for longer uses.
function LogoMooShort({ size = 96, color = '#1A1815', accent = '#B14E2C' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'baseline',
      fontFamily: LOGO_FONT, fontSize: size, fontWeight: 700, color,
      letterSpacing: '-0.055em', lineHeight: 0.9,
    }}>
      moo<span style={{ color: accent }}>.</span>
    </div>
  );
}

// ── 5 · GYM / MOO STACK — type-weight contrast: gym thin, moo bold
//    Captures the duality: gym = serious, moo = playful.
function LogoStack({ size = 56, color = '#1A1815', accent = '#B14E2C', orientation = 'stack' }) {
  if (orientation === 'inline') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'baseline', gap: size * 0.1,
        fontFamily: LOGO_FONT, color, lineHeight: 1, letterSpacing: '-0.04em',
      }}>
        <span style={{ fontSize: size * 0.8, fontWeight: 300, opacity: 0.7 }}>gym</span>
        <span style={{ fontSize: size, fontWeight: 700 }}>moo<span style={{ color: accent }}>.</span></span>
      </div>
    );
  }
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
      fontFamily: LOGO_FONT, color, lineHeight: 0.85, letterSpacing: '-0.04em',
    }}>
      <span style={{ fontSize: size * 0.4, fontWeight: 300, opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        gym
      </span>
      <span style={{ fontSize: size, fontWeight: 700 }}>moo<span style={{ color: accent }}>.</span></span>
    </div>
  );
}

// ── BONUS: App-icon-friendly monogram variants
function LogoIcon({ variant = 'gm', size = 96, color = '#1A1815', accent = '#B14E2C', bg = '#FBF8EF', rounded = 0.22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * rounded,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', border: `1px solid ${color}11`,
    }}>
      {variant === 'gm' && (
        <span style={{
          fontFamily: LOGO_FONT, fontSize: size * 0.5, fontWeight: 700,
          color, letterSpacing: '-0.07em', lineHeight: 1,
        }}>gm<span style={{ color: accent }}>.</span></span>
      )}
      {variant === 'moo' && (
        <span style={{
          fontFamily: LOGO_FONT, fontSize: size * 0.46, fontWeight: 700,
          color, letterSpacing: '-0.07em', lineHeight: 1,
        }}>moo<span style={{ color: accent }}>.</span></span>
      )}
      {variant === 'g' && (
        <span style={{
          fontFamily: LOGO_FONT, fontSize: size * 0.7, fontWeight: 700,
          color, letterSpacing: '-0.04em', lineHeight: 1,
        }}>g<span style={{ color: accent }}>.</span></span>
      )}
      {variant === 'oo' && (
        <span style={{
          fontFamily: LOGO_FONT, fontSize: size * 0.55, fontWeight: 700,
          color, letterSpacing: '-0.12em', lineHeight: 1,
        }}>oo<span style={{ color: accent }}>.</span></span>
      )}
    </div>
  );
}

// Keep the LogoWordmark export for the in-app header
function LogoWordmark({ size = 48, color = '#1A1815', accent = '#B14E2C', tagline, font = LOGO_FONT }) {
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
      fontFamily: font, lineHeight: 1,
    }}>
      <span style={{
        fontSize: size, fontWeight: 600, color, letterSpacing: '-0.04em',
      }}>
        gymmoo<span style={{ color: accent }}>.</span>
      </span>
      {tagline && (
        <span style={{
          fontFamily: LOGO_MONO,
          fontSize: size * 0.18, color, opacity: 0.5,
          letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: size * 0.08,
        }}>{tagline}</span>
      )}
    </div>
  );
}

Object.assign(window, {
  LogoWordmark, LogoStretched, LogoDomain, LogoBarbell, LogoMooShort, LogoStack, LogoIcon,
});
