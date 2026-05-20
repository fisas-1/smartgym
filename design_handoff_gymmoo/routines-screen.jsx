// ─────────────────────────────────────────────────────────────
// SCREEN · RUTINES — list of routines with detail modal
// ─────────────────────────────────────────────────────────────

const MOCK_ROUTINES = [
  {
    id: 'push',
    name: 'Push',
    description: 'Pec, espatlla i tríceps',
    exercises: 5,
    days: [1, 3, 5], // Mon, Wed, Fri
    favorite: true,
    lastDone: 'Avui',
    progress: 2 / 18,
    muscles: ['PEC', 'ESP', 'BRA'],
  },
  {
    id: 'pull',
    name: 'Pull',
    description: 'Esquena i bíceps',
    exercises: 5,
    days: [2, 4],
    favorite: true,
    lastDone: 'Ahir',
    progress: 0,
    muscles: ['ESQ', 'BRA'],
  },
  {
    id: 'legs',
    name: 'Legs',
    description: 'Cames i gluts',
    exercises: 6,
    days: [6],
    favorite: false,
    lastDone: 'fa 3 dies',
    progress: 0,
    muscles: ['CAM', 'GLU'],
  },
  {
    id: 'full',
    name: 'Full Body Quick',
    description: '30 min · cos sencer',
    exercises: 4,
    days: [0],
    favorite: false,
    lastDone: 'fa 1 setmana',
    progress: 0,
    muscles: ['FB'],
  },
];

const DAY_NAMES = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'];

function RoutineCard({ routine, P, T, expanded, onToggle, idx }) {
  const activeText = P.text === '#FAF7F0' ? '#0B0A09' : '#FFFFFF';
  return (
    <div style={{
      background: P.card, border: `1px solid ${P.rule}`, borderRadius: 18,
      marginBottom: 12, overflow: 'hidden', boxShadow: P.shadow,
      transition: 'all 200ms',
      animation: `dopSlideUp 500ms ${idx * 70}ms cubic-bezier(.22,1,.36,1) both`,
    }}>
      <div onClick={onToggle} style={{ padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{
                margin: 0, fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 22,
                color: P.text, letterSpacing: T.headingTracking, lineHeight: 1,
              }}>{routine.name}</h3>
              {routine.favorite && (
                <span style={{ color: P.accent, fontSize: 14 }}>★</span>
              )}
            </div>
            <p style={{
              margin: 0, fontFamily: T.sans, fontSize: 13, color: P.text2,
              lineHeight: 1.3,
            }}>{routine.description}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {routine.muscles.map(m => (
                <span key={m} style={{
                  fontFamily: T.mono, fontSize: 9, padding: '2px 6px',
                  background: P.cardHi, color: P.text2, borderRadius: 4,
                  border: `1px solid ${P.ruleSoft}`,
                  letterSpacing: '0.06em',
                }}>{m}</span>
              ))}
              <span style={{
                fontFamily: T.mono, fontSize: 10, color: P.text3, marginLeft: 4,
              }}>
                {routine.exercises} exercicis · {routine.lastDone}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {DAY_NAMES.map((d, i) => {
                const active = routine.days.includes(i);
                return (
                  <span key={i} style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: active ? P.accent : 'transparent',
                    color: active ? '#FFF' : P.text3,
                    border: `1px solid ${active ? P.accent : P.rule}`,
                    fontFamily: T.mono, fontSize: 8, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{d[0]}</span>
                );
              })}
            </div>
            {routine.progress > 0 && (
              <span style={{
                fontFamily: T.mono, fontSize: 9, color: P.accent,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>en curs</span>
            )}
          </div>
        </div>
      </div>
      {/* In-progress bar */}
      {routine.progress > 0 && (
        <div style={{ height: 2, background: P.ruleSoft }}>
          <div style={{ height: '100%', width: `${routine.progress * 100}%`, background: P.accent }}/>
        </div>
      )}
      {expanded && (
        <div style={{ padding: '4px 16px 14px', borderTop: `1px solid ${P.ruleSoft}` }}>
          <div style={{ display: 'flex', gap: 6, paddingTop: 10 }}>
            <button style={{
              flex: 1, padding: '10px 14px', background: P.accent, color: activeText,
              border: 'none', borderRadius: 12, fontFamily: T.sans, fontWeight: 500,
              fontSize: 13, cursor: 'pointer',
            }}>
              {routine.progress > 0 ? 'Continuar →' : 'Començar →'}
            </button>
            <button style={{
              padding: '10px 14px', background: 'transparent', color: P.text2,
              border: `1px solid ${P.rule}`, borderRadius: 12, fontFamily: T.sans,
              fontSize: 13, cursor: 'pointer',
            }}>Editar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutinesScreen({ mode = 'light', accent = '#B14E2C', typography = 'plex' }) {
  const P = qlPalette(mode, accent);
  const T = TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.plex;
  const [expanded, setExpanded] = React.useState('push');
  const [tab, setTab] = React.useState('all'); // all | fav | deleted

  const filtered = MOCK_ROUTINES.filter(r => tab === 'all' || (tab === 'fav' && r.favorite));

  return (
    <div style={{
      height: '100%', background: P.bg, color: P.text,
      fontFamily: T.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>
            les teves rutines
          </div>
          <h1 style={{
            margin: 0, fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 32,
            letterSpacing: T.headingTracking, color: P.text, lineHeight: 1,
          }}>Rutines.</h1>
        </div>
        <button style={{
          padding: '8px 14px', background: P.accent, color: '#FFF',
          border: 'none', borderRadius: 999, fontFamily: T.sans, fontWeight: 500,
          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 14 }}>+</span> Nova
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 8px' }}>
        {[
          { id: 'all', label: 'Totes', count: MOCK_ROUTINES.length },
          { id: 'fav', label: 'Preferides', count: MOCK_ROUTINES.filter(r => r.favorite).length },
          { id: 'deleted', label: 'Eliminades', count: 2 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', borderRadius: 999,
            background: tab === t.id ? P.text : 'transparent',
            color: tab === t.id ? (P.text === '#FAF7F0' ? '#0B0A09' : '#FFF') : P.text2,
            border: `1px solid ${tab === t.id ? P.text : P.rule}`,
            fontFamily: T.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            <span style={{
              fontFamily: T.mono, fontSize: 10,
              opacity: 0.7,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Routines list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 110px' }}>
        {/* This week glance */}
        <div style={{
          padding: '12px 14px', background: P.card, borderRadius: 16,
          border: `1px solid ${P.rule}`, marginBottom: 16, boxShadow: P.shadow,
        }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 6 }}>
            aquesta setmana
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => {
              const hasRoutine = MOCK_ROUTINES.some(r => r.days.includes(i));
              const today = i === 1; // Monday is today
              return (
                <div key={i} style={{
                  flex: 1, height: 56, borderRadius: 10,
                  background: today ? P.accent + '20' : hasRoutine ? P.cardHi : 'transparent',
                  border: `1px solid ${today ? P.accent : P.rule}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 2px',
                }}>
                  <span style={{
                    fontFamily: T.mono, fontSize: 9, color: today ? P.accent : P.text3,
                    fontWeight: today ? 600 : 400,
                  }}>{d.toUpperCase()}</span>
                  {hasRoutine && (
                    <span style={{
                      width: 5, height: 5, borderRadius: 5,
                      background: today ? P.accent : P.text3,
                    }}/>
                  )}
                  <span style={{
                    fontFamily: T.mono, fontSize: 11, color: today ? P.accent : hasRoutine ? P.text : P.text3,
                    fontWeight: today ? 600 : 500,
                  }}>{i + 12}</span>
                </div>
              );
            })}
          </div>
        </div>

        {filtered.map((r, i) => (
          <RoutineCard key={r.id} routine={r} P={P} T={T} idx={i}
            expanded={expanded === r.id}
            onToggle={() => setExpanded(expanded === r.id ? null : r.id)}/>
        ))}
      </div>

      <QLBottomNav P={P} T={T} active="rutines"/>
      <DopamineStyles/>
    </div>
  );
}

Object.assign(window, { RoutinesScreen });
