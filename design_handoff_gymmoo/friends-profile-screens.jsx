// ─────────────────────────────────────────────────────────────
// SCREENS · AMICS + PERFIL
// ─────────────────────────────────────────────────────────────

const MOCK_FRIENDS = [
  { id: 'julia', name: 'júlia', initials: 'JL', consistency: 94, days: 28, streak: 14, isYou: false, color: '#5E8F3A' },
  { id: 'marc', name: 'marc (tu)', initials: 'M',  consistency: 87, days: 26, streak: 12, isYou: true,  color: null },
  { id: 'pol',  name: 'pol',   initials: 'PO', consistency: 78, days: 23, streak: 4,  isYou: false, color: '#B14E2C' },
  { id: 'anna', name: 'anna',  initials: 'AN', consistency: 54, days: 16, streak: 0,  isYou: false, color: '#8568B0' },
  { id: 'roger', name: 'roger', initials: 'RG', consistency: 30, days: 9,  streak: 0,  isYou: false, color: '#5C8EB0' },
];

const REACTIONS = [
  { id: 'moo',     label: '🐄 Moo-tivar', text: 'Moo-tivat!' },
  { id: 'volt',    label: '⚡ Donar Volt', text: 'Volt donat!' },
  { id: 'energy',  label: '💉 Injectar', text: 'Energia injectada!' },
  { id: 'push',    label: '🚀 Empènyer', text: 'Empès!' },
];

function FriendRow({ f, rank, P, T, onReact, reaction, idx = 0 }) {
  const isMe = f.isYou;
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
  return (
    <div style={{
      padding: '12px 14px', background: isMe ? P.cardHi : P.card,
      border: `1px solid ${isMe ? P.accent : P.rule}`, borderRadius: 16,
      marginBottom: 8, boxShadow: P.shadow, position: 'relative',
      animation: `dopSlideUp 500ms ${idx * 60 + 100}ms cubic-bezier(.22,1,.36,1) both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: T.mono, fontSize: 13, color: P.text3, width: 18, fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}>{medal || `${rank + 1}.`}</span>
        <div style={{
          width: 40, height: 40, borderRadius: 999,
          background: f.color || P.accent, color: '#FFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 16,
        }}>{f.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: T.sans, fontSize: 15, fontWeight: 500, color: P.text,
              letterSpacing: '-0.005em',
            }}>{f.name}</span>
            {f.streak > 0 && (
              <span style={{ fontFamily: T.mono, fontSize: 10, color: P.text3 }}>🔥 {f.streak}</span>
            )}
          </div>
          <div style={{
            fontFamily: T.mono, fontSize: 11, color: P.text3,
            fontVariantNumeric: 'tabular-nums', marginTop: 1,
          }}>{f.days}/30 dies · {f.consistency > 80 ? 'en forma' : f.consistency > 50 ? 'estable' : f.streak === 0 ? `inactiu fa ${30 - f.days}d` : 'irregular'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 22, fontWeight: 500, color: P.text,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>{f.consistency}<span style={{ fontSize: 11, color: P.text3 }}>%</span></div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: P.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>consistència</div>
        </div>
      </div>
      {/* Consistency bar */}
      <div style={{ marginTop: 10 }}>
        <AnimatedBar value={f.consistency} max={100}
          color={f.streak === 0 ? P.text3 : isMe ? P.accent : P.good}
          bg={P.cardHi} height={3} delay={idx * 80 + 400}/>
      </div>
      {/* Reaction buttons (not for me) */}
      {!isMe && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
          {REACTIONS.map(r => (
            <TapScale key={r.id} onClick={() => onReact(f.id, r.text, r.id)} scale={0.92}>
              <div style={{
                padding: '5px 9px', borderRadius: 999, fontFamily: T.sans, fontSize: 11,
                background: 'transparent', color: P.text2,
                border: `1px solid ${P.rule}`,
              }}>{r.label}</div>
            </TapScale>
          ))}
        </div>
      )}
      {reaction && (
        <>
          <div style={{
            position: 'absolute', right: 14, top: 14,
            padding: '4px 10px', background: P.accent, color: '#FFF',
            borderRadius: 999, fontFamily: T.sans, fontSize: 11, fontWeight: 500,
            animation: 'friendsPop 320ms cubic-bezier(.34,1.5,.64,1) both',
          }}>{reaction.text}</div>
          {/* Floating emoji */}
          <div style={{
            position: 'absolute', right: 22, top: 14, fontSize: 24, pointerEvents: 'none',
            animation: 'friendsFloat 1600ms ease-out both',
            zIndex: 10,
          }}>{reaction.kind === 'moo' ? '🐄' : reaction.kind === 'volt' ? '⚡' : reaction.kind === 'energy' ? '💉' : '🚀'}</div>
        </>
      )}
    </div>
  );
}

function FriendsScreen({ mode = 'light', accent = '#B14E2C', typography = 'plex' }) {
  const P = qlPalette(mode, accent);
  const T = TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.plex;
  const [reactions, setReactions] = React.useState({});
  const [search, setSearch] = React.useState('');

  const handleReact = (userId, text, kind) => {
    setReactions(prev => ({ ...prev, [userId]: { text, kind } }));
    setTimeout(() => setReactions(prev => ({ ...prev, [userId]: null })), 2400);
  };

  const sorted = [...MOCK_FRIENDS].sort((a, b) => b.consistency - a.consistency);

  return (
    <div style={{
      height: '100%', background: P.bg, color: P.text,
      fontFamily: T.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>
          feed de competició
        </div>
        <h1 style={{
          margin: 0, fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 32,
          letterSpacing: T.headingTracking, color: P.text, lineHeight: 1,
        }}>Amics.</h1>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 14px', background: P.card, border: `1px solid ${P.rule}`,
          borderRadius: 14, boxShadow: P.shadow,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.text3} strokeWidth="2">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Busca un usuari..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: P.text, fontFamily: T.sans, fontSize: 13,
            }}/>
        </div>
      </div>

      {/* This week leaderboard glance */}
      <div style={{ padding: '14px 20px 6px' }}>
        <div style={{
          padding: '12px 14px', background: P.card, border: `1px solid ${P.rule}`,
          borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: P.shadow,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>
              aquesta setmana
            </div>
            <div style={{
              fontFamily: T.display, fontSize: 17, color: P.text,
              fontWeight: T.displayWeight, letterSpacing: T.headingTracking, lineHeight: 1.1,
            }}>la Júlia va al capdavant 🥇</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: P.text3, marginTop: 3 }}>
              ets a <span style={{ color: P.accent, fontWeight: 500 }}>−7%</span> · només 2 sessions per atrapar-la
            </div>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 20px 110px' }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>rànquing · 30 dies</span>
          <span>{MOCK_FRIENDS.length} amics</span>
        </div>
        {sorted.map((f, i) => (
          <FriendRow key={f.id} f={f} rank={i} idx={i} P={P} T={T} onReact={handleReact} reaction={reactions[f.id]}/>
        ))}
      </div>

      <QLBottomNav P={P} T={T} active="amics"/>

      <DopamineStyles/>
      <style>{`
        @keyframes friendsPop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE SCREEN
// ─────────────────────────────────────────────────────────────

const PROFILE_LEVELS = [
  { exercise: 'Press Banca',    oneRM: 96.5, level: 'Intermedi',  color: '#3b82f6', ratio: 1.27 },
  { exercise: 'Sentadilles',    oneRM: 140,  level: 'Avançat',    color: '#a855f7', ratio: 1.84 },
  { exercise: 'Pes Mort',       oneRM: 165,  level: 'Avançat',    color: '#a855f7', ratio: 2.17 },
  { exercise: 'Dominades',      oneRM: 95,   level: 'Intermedi',  color: '#3b82f6', ratio: 1.25 },
  { exercise: 'Press Militar',  oneRM: 56,   level: 'Intermedi',  color: '#3b82f6', ratio: 0.74 },
  { exercise: 'Curl de Bíceps', oneRM: 18,   level: 'Principiant', color: '#22c55e', ratio: 0.24 },
];

function ProfileScreen({ mode = 'light', accent = '#B14E2C', typography = 'plex' }) {
  const P = qlPalette(mode, accent);
  const T = TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.plex;
  const [showFav, setShowFav] = React.useState(false);

  return (
    <div style={{
      height: '100%', background: P.bg, color: P.text,
      fontFamily: T.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>
              el teu perfil
            </div>
            <h1 style={{
              margin: 0, fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 32,
              letterSpacing: T.headingTracking, color: P.text, lineHeight: 1,
            }}>Perfil.</h1>
          </div>
          <button style={{
            background: 'transparent', border: `1px solid ${P.rule}`, color: P.text2,
            padding: '7px 12px', borderRadius: 999, fontFamily: T.sans, fontSize: 12, cursor: 'pointer',
          }}>tema · clar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 110px' }}>
        {/* Avatar + name */}
        <div style={{
          padding: '18px 16px', background: P.card,
          border: `1px solid ${P.rule}`, borderRadius: 18,
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
          boxShadow: P.shadow,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 999,
            background: P.accent, color: '#FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 24,
            letterSpacing: T.headingTracking,
          }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 22,
              color: P.text, letterSpacing: T.headingTracking, lineHeight: 1,
            }}>Marc</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: P.text3, marginTop: 4 }}>
              marc@gymmoo.cat · membre des de mar '26
            </div>
            <button style={{
              marginTop: 8, padding: '4px 10px', background: 'transparent',
              color: P.text2, border: `1px solid ${P.rule}`, borderRadius: 999,
              fontFamily: T.sans, fontSize: 11, cursor: 'pointer',
            }}>editar</button>
          </div>
        </div>

        {/* Streak + Level overall */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{
            padding: '14px', background: P.card, border: `1px solid ${P.rule}`,
            borderRadius: 16, boxShadow: P.shadow,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 4 }}>
              ratxa activa
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontFamily: T.mono, fontSize: 30, fontWeight: 500, color: P.accent,
                lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
              }}>12</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: P.text3 }}>dies 🔥</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: P.text3, marginTop: 3 }}>
              millor: 18d
            </div>
          </div>
          <div style={{
            padding: '14px', background: P.card, border: `1px solid ${P.rule}`,
            borderRadius: 16, boxShadow: P.shadow,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 4 }}>
              nivell global
            </div>
            <div style={{
              fontFamily: T.display, fontSize: 22, fontWeight: T.displayWeight, color: P.text,
              lineHeight: 1, letterSpacing: T.headingTracking,
            }}>Intermedi</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: P.text3, marginTop: 3 }}>
              68% cap a Avançat
            </div>
            <div style={{ height: 3, background: P.cardHi, borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '68%', background: P.accent }}/>
            </div>
          </div>
        </div>

        {/* Body data */}
        <div style={{
          padding: '14px 16px', background: P.card, border: `1px solid ${P.rule}`,
          borderRadius: 16, marginBottom: 14, boxShadow: P.shadow,
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 10,
          }}>dades</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
            {[
              { l: 'edat', v: '30', u: '' },
              { l: 'alçada', v: '178', u: 'cm' },
              { l: 'pes', v: '76', u: 'kg' },
              { l: 'sexe', v: 'M', u: '' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'left', borderLeft: i > 0 ? `1px solid ${P.ruleSoft}` : 'none', paddingLeft: i > 0 ? 10 : 0 }}>
                <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3 }}>{s.l}</div>
                <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 500, color: P.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {s.v}<span style={{ fontSize: 10, color: P.text3, marginLeft: 1 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strength per exercise */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 10,
          }}>per exercici</div>
          {PROFILE_LEVELS.map(lv => (
            <div key={lv.exercise} style={{
              padding: '12px 14px', background: P.card,
              border: `1px solid ${P.rule}`, borderRadius: 14,
              marginBottom: 6, boxShadow: P.shadow,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 500, color: P.text }}>
                  {lv.exercise}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 8, background: lv.color, flexShrink: 0,
                  }}/>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: P.text2 }}>
                    {lv.level}
                  </span>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: P.text3 }}>
                    · {lv.ratio.toFixed(2)}× pes corp.
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 18, fontWeight: 500, color: P.text,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em',
                }}>{lv.oneRM}<span style={{ fontSize: 10, color: P.text3, marginLeft: 1 }}>kg</span></div>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: P.text3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>1RM</div>
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 10,
          }}>preferències</div>
          {[
            { label: 'Unitat de pes', value: 'kg' },
            { label: 'Unitat d\'alçada', value: 'cm' },
            { label: 'Idioma', value: 'Català' },
            { label: 'Tema', value: 'clar' },
          ].map((s, i, arr) => (
            <div key={i} style={{
              padding: '12px 14px', background: P.card,
              border: `1px solid ${P.rule}`,
              borderTop: i === 0 ? `1px solid ${P.rule}` : 'none',
              borderRadius: i === 0 ? '14px 14px 0 0' : i === arr.length - 1 ? '0 0 14px 14px' : 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: i === 0 ? P.shadow : 'none', marginTop: i === 0 ? 0 : '-1px',
            }}>
              <span style={{ fontFamily: T.sans, fontSize: 13, color: P.text2 }}>{s.label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: P.text }}>{s.value} <span style={{ color: P.text3 }}>›</span></span>
            </div>
          ))}
        </div>

        <button style={{
          width: '100%', padding: '12px', background: 'transparent',
          color: '#A04A30', border: `1px solid ${P.rule}`, borderRadius: 12,
          fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Tancar sessió</button>
      </div>

      <QLBottomNav P={P} T={T} active="perfil"/>
      <DopamineStyles/>
    </div>
  );
}

Object.assign(window, { FriendsScreen, ProfileScreen });
