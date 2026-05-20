// ─────────────────────────────────────────────────────────────
// QUICK-LOG FORM — typography-aware. Pass `typography` to swap fonts.
// ─────────────────────────────────────────────────────────────

const TYPOGRAPHY_SYSTEMS = {
  plex: {
    name: 'Plex',
    hint: 'tècnic, neutral · IBM Plex',
    sans: '"IBM Plex Sans", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
    display: '"IBM Plex Sans", system-ui, sans-serif',
    displayWeight: 500,
    headingTracking: '-0.02em',
  },
  geist: {
    name: 'Geist',
    hint: 'modern, cristal·lí · Vercel',
    sans: '"Geist", "IBM Plex Sans", system-ui, sans-serif',
    mono: '"Geist Mono", "IBM Plex Mono", ui-monospace, monospace',
    display: '"Geist", system-ui, sans-serif',
    displayWeight: 600,
    headingTracking: '-0.03em',
  },
  bricolage: {
    name: 'Bricolage',
    hint: 'variable, distintiu · més caràcter',
    sans: '"Bricolage Grotesque", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    display: '"Bricolage Grotesque", system-ui, sans-serif',
    displayWeight: 700,
    headingTracking: '-0.035em',
    displayStyle: 'font-variation-settings: "wdth" 80;',
  },
  editorial: {
    name: 'Editorial',
    hint: 'serif + sans · revista',
    sans: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    display: '"Instrument Serif", "EB Garamond", Georgia, serif',
    displayWeight: 400,
    headingTracking: '-0.02em',
  },
  space: {
    name: 'Space',
    hint: 'esportiu, sci-fi · Space Grotesk',
    sans: '"Space Grotesk", system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
    display: '"Space Grotesk", system-ui, sans-serif',
    displayWeight: 600,
    headingTracking: '-0.03em',
  },
};

function qlPalette(mode, accent) {
  if (mode === 'dark') {
    return {
      bg: '#0B0A09', card: '#15130F', cardHi: '#1C1A15',
      input: '#1F1D17', inputBig: '#15130F',
      rule: '#2A2620', ruleSoft: '#1C1A15',
      text: '#FAF7F0', text2: '#A19C8E', text3: '#6B6759',
      accent, accentSoft: accent + '26', accentTint: accent + '14',
      good: '#7CB35B', navBg: 'rgba(11,10,9,0.85)', shadow: 'none',
    };
  }
  return {
    bg: '#F5F2EA', card: '#FFFFFF', cardHi: '#FBF8EF',
    input: '#FBF8EF', inputBig: '#FFFFFF',
    rule: '#E7E2D2', ruleSoft: '#EFEBDD',
    text: '#1A1815', text2: '#56524A', text3: '#8F8B81',
    accent, accentSoft: accent + '22', accentTint: accent + '10',
    good: '#5E8F3A', navBg: 'rgba(245,242,234,0.85)',
    shadow: '0 1px 2px rgba(20,15,5,0.03), 0 4px 16px rgba(20,15,5,0.04)',
  };
}

const QL_EXERCISES = [
  { name: 'Press Banca', short: 'Press Banca', muscle: 'PEC', repsMin: 8, repsMax: 12, last: { w: 72.5, r: 9, rir: 1 }, best1RM: 96.5 },
  { name: 'Press Banca Inclinat', short: 'Inclinat', muscle: 'PEC', repsMin: 8, repsMax: 12, last: { w: 55, r: 10, rir: 2 }, best1RM: 74 },
  { name: 'Chest Fly', short: 'Chest Fly', muscle: 'PEC', repsMin: 12, repsMax: 15, last: { w: 14, r: 13, rir: 2 }, best1RM: 18 },
  { name: 'Flexions', short: 'Flexions', muscle: 'PEC', repsMin: 10, repsMax: 20, last: { w: 0, r: 18, rir: 2 }, best1RM: 0 },
  { name: 'Press Militar', short: 'Militar', muscle: 'ESP', repsMin: 8, repsMax: 12, last: { w: 22.5, r: 11, rir: 2 }, best1RM: 32 },
];

const QL_VARIANTS = ['Barra', 'Mancuernes', 'Màquina', 'Politja'];

function QLBottomNav({ P, T, active = 'home' }) {
  const items = [
    { id: 'home', label: 'Inici', icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z M9 21V12h6v9"/> },
    { id: 'rutines', label: 'Rutines', icon: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></> },
    { id: 'stats', label: 'Estadístiques', icon: <path d="M4 20V14M9 20V8M14 20V12M19 20V4"/> },
    { id: 'amics', label: 'Amics', icon: <><circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M21 20c0-2.8-1.8-5.1-4.5-5.8"/></> },
    { id: 'perfil', label: 'Perfil', icon: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '6px 4px 22px', borderTop: `1px solid ${P.rule}`,
      background: P.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'stretch', zIndex: 5,
    }}>
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <div key={it.id} style={{ flex: 1, padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: 44, height: 26, borderRadius: 999,
              background: isActive ? P.accentTint : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 200ms',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isActive ? P.accent : P.text3} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {it.icon}
              </svg>
            </div>
            <span style={{
              fontFamily: T.sans, fontSize: 9, letterSpacing: '0.02em',
              color: isActive ? P.text : P.text3, fontWeight: isActive ? 500 : 400,
            }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function QLLabel({ children, P, T, accent, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: accent ? P.accent : P.text3, fontWeight: 500,
      }}>{children}</span>
      {hint && <span style={{ fontFamily: T.mono, fontSize: 10, color: P.text3 }}>{hint}</span>}
    </div>
  );
}

function QLPill({ active, onClick, children, size = 'md', P, T, muscle }) {
  const padding = size === 'sm' ? '6px 12px' : '10px 16px';
  const fontSize = size === 'sm' ? 12 : 14;
  const activeText = P.text === '#FAF7F0' ? '#0B0A09' : '#FFFFFF';
  return (
    <button onClick={onClick} style={{
      padding, borderRadius: 999, flexShrink: 0,
      background: active ? P.text : 'transparent',
      color: active ? activeText : P.text2,
      border: `1px solid ${active ? P.text : P.rule}`,
      fontFamily: T.sans, fontSize, fontWeight: active ? 500 : 400,
      cursor: 'pointer', transition: 'all 180ms',
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    }}>
      {children}
      {muscle && !active && (
        <span style={{
          fontFamily: T.mono, fontSize: 9, padding: '1px 5px',
          background: P.rule, color: P.text3, borderRadius: 4, letterSpacing: '0.06em',
        }}>{muscle}</span>
      )}
    </button>
  );
}

function calc1RM(w, r) {
  if (!w || !r) return 0;
  const denom = 1.0278 - 0.0278 * r;
  if (denom <= 0) return 0;
  return Math.round(w / denom * 10) / 10;
}

const qlStepBtn = (P, T, size) => ({
  width: size === 'big' ? 56 : 44, height: size === 'big' ? 56 : 44,
  background: P.card, color: P.text,
  border: `1px solid ${P.rule}`, borderRadius: size === 'big' ? 18 : 14,
  fontFamily: T.mono, fontSize: size === 'big' ? 22 : 18, fontWeight: 400,
  cursor: 'pointer', flexShrink: 0,
});

function QuickLogForm({ mode = 'light', accent = '#B14E2C', typography = 'plex' }) {
  const P = qlPalette(mode, accent);
  const T = TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.plex;
  const [exIdx, setExIdx] = React.useState(0);
  const [variant, setVariant] = React.useState(0);
  const [weight, setWeight] = React.useState(75);
  const [reps, setReps] = React.useState(0);
  const [rir, setRir] = React.useState(2);
  const [notes, setNotes] = React.useState('');
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);
  const [confetti, setConfetti] = React.useState(false);
  const [isPRsave, setIsPRsave] = React.useState(false);
  const [streakCount, setStreakCount] = React.useState(STREAK_DAYS);

  const exercise = QL_EXERCISES[exIdx];
  const one1RM = calc1RM(weight, reps);
  const isPRweight = weight > exercise.last.w;
  const inRange = reps >= exercise.repsMin && reps <= exercise.repsMax;
  const repPills = [5, 8, 10, 12, 15, 20];

  const handleSave = () => {
    if (!reps) return;
    const isPR = weight > exercise.last.w || one1RM > exercise.best1RM;
    setIsPRsave(isPR);
    setJustSaved(true);
    setConfetti(true);
    setStreakCount(c => c + 1);
    setTimeout(() => setJustSaved(false), isPR ? 2400 : 1600);
    setTimeout(() => setConfetti(false), 1400);
    setTimeout(() => setReps(0), 600);
  };

  return (
    <div style={{
      height: '100%', background: P.bg, color: P.text,
      fontFamily: T.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ animation: 'dopSlideUp 460ms cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{
            fontFamily: T.display, fontSize: 22, fontWeight: T.displayWeight,
            color: P.text, letterSpacing: '-0.035em', lineHeight: 1,
            display: 'inline-flex', alignItems: 'baseline',
          }}>
            <span style={{ opacity: 0.7 }}>gym</span>
            <span style={{ color: P.accent, fontWeight: 700 }}>.</span>
            <span>moo</span>
            <span style={{ color: P.accent, fontWeight: 700 }}>.</span>
          </div>
          <div style={{
            fontFamily: T.mono, fontSize: 11, color: P.text3,
            letterSpacing: '0.06em', marginTop: 3,
          }}>
            Bon dia, {USER_FIRST} — entrenem?
          </div>
        </div>
        <div key={streakCount} style={{
          padding: '6px 10px', borderRadius: 12, background: P.cardHi,
          border: `1px solid ${P.rule}`, display: 'flex', alignItems: 'center', gap: 6,
          animation: streakCount > STREAK_DAYS ? 'dopScalePop 480ms cubic-bezier(.34,1.56,.64,1) both' : 'dopSlideUp 460ms cubic-bezier(.22,1,.36,1) both',
        }}>
          <StreakFlame size={14} intense={streakCount > STREAK_DAYS}/>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: P.text, fontWeight: 500 }}>{streakCount}</span>
        </div>
      </div>

      {/* Today recap */}
      <div style={{
        margin: '12px 20px 0', padding: '10px 14px',
        background: P.card, border: `1px solid ${P.rule}`, borderRadius: 14,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', boxShadow: P.shadow,
      }}>
        {[
          { label: 'avui', value: '4', sub: 'sèries' },
          { label: 'volum', value: '0.42t', sub: '+12%', accent: true },
          { label: 'sessió', value: '14:02', sub: 'min' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', borderLeft: i > 0 ? `1px solid ${P.ruleSoft}` : 'none' }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3 }}>{s.label}</div>
            <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: P.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: s.accent ? P.good : P.text3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px 110px' }}>
        <QLLabel P={P} T={T}>exercici</QLLabel>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
          {QL_EXERCISES.map((ex, i) => (
            <QLPill key={ex.name} active={exIdx === i} onClick={() => setExIdx(i)} P={P} T={T} muscle={ex.muscle}>
              {ex.short}
            </QLPill>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {QL_VARIANTS.map((v, i) => (
            <QLPill key={v} active={variant === i} onClick={() => setVariant(i)} P={P} T={T} size="sm">
              {v}
            </QLPill>
          ))}
        </div>

        {/* Weight */}
        <QLLabel P={P} T={T} hint={`anterior ${exercise.last.w}kg`}>pes (kg)</QLLabel>
        <div style={{
          background: P.inputBig, border: `1px solid ${isPRweight ? P.accent : P.rule}`, borderRadius: 18,
          padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16, boxShadow: P.shadow, position: 'relative', overflow: 'hidden',
          transition: 'border-color 240ms',
          animation: 'dopSlideUp 500ms 60ms cubic-bezier(.22,1,.36,1) both',
        }}>
          {isPRweight && (
            <span style={{
              position: 'absolute', top: 10, right: 14, fontFamily: T.mono, fontSize: 9,
              padding: '2px 7px', background: P.accent, color: '#FFF', borderRadius: 999,
              letterSpacing: '0.06em', fontWeight: 500,
              animation: 'dopScalePop 380ms cubic-bezier(.34,1.56,.64,1) both',
            }}>RÈCORD</span>
          )}
          <TapScale onClick={() => setWeight(Math.max(0, weight - 2.5))} style={qlStepBtn(P, T, 'big')}>−</TapScale>
          <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            <AnimatedNumber
              value={weight}
              duration={220}
              format={v => v.toFixed(v % 1 === 0 ? 0 : 1).replace(/\.?0+$/, '')}
              style={{
                fontFamily: T.mono, fontWeight: 400, fontSize: 56, lineHeight: 1,
                color: isPRweight ? P.accent : P.text, fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em', display: 'inline-block',
                transition: 'color 200ms',
              }}/>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: P.text3, marginTop: 4, letterSpacing: '0.08em' }}>±2.5</div>
          </div>
          <TapScale onClick={() => setWeight(weight + 2.5)} style={qlStepBtn(P, T, 'big')}>+</TapScale>
        </div>

        {/* Reps */}
        <QLLabel P={P} T={T} hint={`obj. ${exercise.repsMin}–${exercise.repsMax} reps`}>reps</QLLabel>
        <div style={{
          background: P.inputBig, border: `1px solid ${P.rule}`, borderRadius: 18,
          padding: '12px 14px', marginBottom: 10, boxShadow: P.shadow,
          animation: 'dopSlideUp 500ms 120ms cubic-bezier(.22,1,.36,1) both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TapScale onClick={() => setReps(Math.max(0, reps - 1))} style={qlStepBtn(P, T)}>−</TapScale>
            <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div key={reps} style={{
                fontFamily: T.mono, fontWeight: 400, fontSize: 44, lineHeight: 1,
                color: reps ? (inRange ? P.accent : P.text) : P.text3,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                animation: reps ? 'dopFlip 280ms cubic-bezier(.34,1.56,.64,1) both' : 'none',
                transition: 'color 200ms',
              }}>{reps || 0}</div>
              {inRange && reps > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: 4, fontFamily: T.mono, fontSize: 9,
                  padding: '2px 6px', background: P.accent + '22', color: P.accent,
                  borderRadius: 999, letterSpacing: '0.06em', fontWeight: 500,
                  animation: 'dopScalePop 360ms cubic-bezier(.34,1.56,.64,1) both',
                }}>OBJECTIU ✓</span>
              )}
            </div>
            <TapScale onClick={() => setReps(reps + 1)} style={qlStepBtn(P, T)}>+</TapScale>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {repPills.map(n => {
            const sel = reps === n;
            const isHighlighted = n >= exercise.repsMin && n <= exercise.repsMax;
            return (
              <TapScale key={n} onClick={() => setReps(n)} style={{ flex: 1 }}>
                <div style={{
                  width: '100%', padding: '8px 0', borderRadius: 999,
                  background: sel ? P.accent : 'transparent',
                  color: sel ? '#FFF' : P.text2,
                  border: `1px solid ${sel ? P.accent : (isHighlighted ? P.accent + '50' : P.rule)}`,
                  fontFamily: T.mono, fontSize: 13, fontWeight: 500,
                  textAlign: 'center', position: 'relative',
                  transition: 'all 220ms',
                  boxShadow: sel ? `0 4px 12px ${P.accent}55` : 'none',
                }}>
                  {n}
                  {isHighlighted && !sel && (
                    <span style={{
                      position: 'absolute', top: 3, right: 6, width: 4, height: 4, borderRadius: 4,
                      background: P.accent,
                    }}/>
                  )}
                </div>
              </TapScale>
            );
          })}
        </div>

        <QLLabel P={P} T={T} hint="repeticions en reserva">RIR</QLLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[0, 1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setRir(n)} style={{
              flex: 1, padding: '12px 0', borderRadius: 14,
              background: rir === n ? P.cardHi : 'transparent',
              border: `1px solid ${rir === n ? P.accent : P.rule}`,
              fontFamily: T.sans, color: rir === n ? P.text : P.text2,
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              boxShadow: rir === n ? `0 0 0 3px ${P.accentTint}` : 'none', transition: 'all 180ms',
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: rir === n ? P.accent : P.text2 }}>{n}</span>
              <span style={{ fontSize: 9, color: P.text3, letterSpacing: '0.04em' }}>
                {n === 0 ? 'fallo' : n === 1 ? 'molt' : n === 2 ? 'dur' : n === 3 ? 'còmode' : 'fàcil'}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: P.card, border: `1px solid ${P.rule}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>1RM estimat</div>
            <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 500, color: one1RM > exercise.best1RM ? P.accent : P.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {one1RM || '—'}<span style={{ fontSize: 10, color: P.text3, marginLeft: 2 }}>kg</span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: P.card, border: `1px solid ${P.rule}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>millor 1RM</div>
            <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 500, color: P.text2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {exercise.best1RM}<span style={{ fontSize: 10, color: P.text3, marginLeft: 2 }}>kg</span>
            </div>
          </div>
        </div>

        {!notesOpen ? (
          <button onClick={() => setNotesOpen(true)} style={{
            background: 'transparent', border: 'none', color: P.text3,
            fontFamily: T.sans, fontSize: 12, cursor: 'pointer', padding: '6px 0',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 13 }}>+</span> afegir nota
          </button>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <QLLabel P={P} T={T}>nota</QLLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Sensació, tècnica, dolor..."
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 14,
                background: P.input, border: `1px solid ${P.rule}`, color: P.text,
                fontFamily: T.sans, fontSize: 14, minHeight: 64, resize: 'vertical', outline: 'none',
              }}/>
          </div>
        )}
      </div>

      {/* PR celebration overlay */}
      {justSaved && isPRsave && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
          background: `radial-gradient(circle at 50% 50%, ${P.accent}28 0%, transparent 70%)`,
          animation: 'dopFade 1800ms ease-out both',
        }}/>
      )}

      {/* Confetti from CTA position */}
      <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, height: 0, zIndex: 49 }}>
        <Confetti active={confetti}
          colors={isPRsave ? [P.accent, '#FFD93D', '#FFFFFF', '#FF8C42'] : [P.accent, P.good, '#FFFFFF']}
          count={isPRsave ? 36 : 22}/>
        <Sparkles active={confetti && isPRsave} color={'#FFD93D'} count={10}/>
      </div>

      {justSaved && (
        <div style={{
          position: 'absolute', left: 20, right: 20, bottom: 156,
          padding: '12px 16px',
          background: isPRsave
            ? `linear-gradient(135deg, ${P.accent}, ${isPRsave ? '#FF8C42' : P.accent})`
            : P.accent,
          color: '#FFF',
          borderRadius: 14, fontFamily: T.sans, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'dopScalePop 380ms cubic-bezier(.34,1.56,.64,1) both',
          zIndex: 4, boxShadow: `0 12px 32px ${P.accent}55, 0 0 0 4px ${P.accent}22`,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 22, background: '#FFF', color: P.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.mono, fontSize: 13, fontWeight: 700,
            animation: 'dopStarPop 600ms cubic-bezier(.34,1.56,.64,1) both',
          }}>{isPRsave ? '★' : '✓'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', fontWeight: 600, opacity: 0.85 }}>
              {isPRsave ? 'RÈCORD PERSONAL' : 'SÈRIE DESADA'}
            </div>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: T.displayWeight, lineHeight: 1.1, marginTop: 2, letterSpacing: T.headingTracking }}>
              {isPRsave ? `¡Nou màxim! ${weight}kg × ${reps}` : `${weight}kg × ${reps}`}
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 74,
        padding: '10px 16px 6px',
        background: `linear-gradient(to top, ${P.bg} 60%, transparent)`,
        pointerEvents: 'none', zIndex: 3,
      }}>
        <TapScale onClick={handleSave} disabled={!reps} style={{ width: '100%', pointerEvents: 'auto' }}>
          <div style={{
            width: '100%', padding: '15px', background: reps ? P.accent : P.cardHi,
            color: reps ? '#FFF' : P.text3,
            border: 'none', borderRadius: 16,
            fontFamily: T.sans, fontWeight: 500, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            letterSpacing: '0.01em',
            boxShadow: reps ? `0 8px 22px ${P.accent}55, 0 2px 4px ${P.accent}22` : 'none',
            transition: 'background 240ms, box-shadow 240ms',
            animation: reps ? 'dopBreathe 2400ms ease-in-out infinite' : 'none',
          }}>
            {reps ? (
              <>
                <span>Anotar sèrie</span>
                <span style={{ opacity: 0.75, fontFamily: T.mono, fontSize: 13 }}>
                  · {weight}<span style={{ opacity: 0.6 }}>kg</span> × {reps}
                </span>
                {isPRweight && <span style={{ fontSize: 16 }}>🏆</span>}
              </>
            ) : <span>Posa les reps per anotar</span>}
          </div>
        </TapScale>
      </div>

      <QLBottomNav P={P} T={T} active="home"/>

      <DopamineStyles/>
      <style>{`
        @keyframes qlSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes dopFade { from { opacity: 0; } 30% { opacity: 1; } to { opacity: 0; } }
        textarea::placeholder { color: ${P.text3}; }
      `}</style>
    </div>
  );
}

Object.assign(window, { QuickLogForm, qlPalette, TYPOGRAPHY_SYSTEMS, QLBottomNav, QLLabel, QLPill, qlStepBtn, calc1RM });
