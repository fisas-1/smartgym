// ─────────────────────────────────────────────────────────────
// SCREEN · ESTADÍSTIQUES — period filter, muscle bars, chart, history
// ─────────────────────────────────────────────────────────────

const MUSCLE_STATS = [
  { id: 'esq',  label: 'Esquena',    improvement: 18, current: 102, previous: 86 },
  { id: 'pec',  label: 'Pectoral',   improvement: 12, current: 96.5, previous: 86 },
  { id: 'cam',  label: 'Cames',      improvement: 8,  current: 145,  previous: 134 },
  { id: 'esp',  label: 'Espatlles',  improvement: 6,  current: 32,   previous: 30 },
  { id: 'bra',  label: 'Braços',     improvement: 4,  current: 36,   previous: 34.5 },
  { id: 'abd',  label: 'Abdominals', improvement: 0,  current: 0,    previous: 0 },
];

const WEEKLY_VOLUME = [
  { muscle: 'Pectoral',   thisWeek: 4200, lastWeek: 3850, diff: 9 },
  { muscle: 'Esquena',    thisWeek: 3900, lastWeek: 3300, diff: 18 },
  { muscle: 'Cames',      thisWeek: 5100, lastWeek: 4800, diff: 6 },
  { muscle: 'Espatlles',  thisWeek: 1800, lastWeek: 1850, diff: -3 },
  { muscle: 'Braços',     thisWeek: 1400, lastWeek: 1280, diff: 9 },
];

// 1RM evolution data for Press Banca
const CHART_POINTS = [
  { day: '15 abr', max: 84 },
  { day: '22 abr', max: 86 },
  { day: '29 abr', max: 88.5 },
  { day: '06 mai', max: 90 },
  { day: '13 mai', max: 93 },
  { day: '20 mai', max: 96.5 },
];

const SESSION_HISTORY = [
  { date: '20 mai 2026', isPR: true, max1RM: 96.5, sets: ['75kg × 10 · RIR 2', '75kg × 9 · RIR 1', '75kg × 8 · RIR 0', '70kg × 9 · RIR 1'], note: 'Buena sensació, podria pujar 2.5kg' },
  { date: '17 mai 2026', isPR: false, max1RM: 93, sets: ['72.5kg × 10 · RIR 2', '72.5kg × 9 · RIR 1', '72.5kg × 7 · RIR 0'], note: null },
  { date: '13 mai 2026', isPR: false, max1RM: 90, sets: ['70kg × 11 · RIR 2', '70kg × 9 · RIR 1', '70kg × 8 · RIR 1'], note: 'Brut, no he descansat prou' },
];

const EX_LIST = ['Press Banca', 'Sentadilles', 'Dominades', 'Press Militar', 'Curl de Bíceps'];

function MuscleBar({ stat, P, T, max, idx }) {
  const pct = max > 0 ? Math.min(Math.abs(stat.improvement) / max * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10, animation: `dopSlideUp 480ms ${idx * 60}ms cubic-bezier(.22,1,.36,1) both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontFamily: T.sans, color: P.text2, fontWeight: 400 }}>{stat.label}</span>
        <span style={{
          fontFamily: T.mono, fontSize: 12,
          color: stat.improvement > 0 ? P.good : stat.improvement < 0 ? '#A04A30' : P.text3,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {stat.improvement > 0 ? '+' : ''}{stat.improvement}%
        </span>
      </div>
      <AnimatedBar value={Math.abs(stat.improvement)} max={max}
        color={stat.improvement > 0 ? P.good : stat.improvement < 0 ? '#A04A30' : P.rule}
        bg={P.cardHi} height={5} delay={idx * 80 + 100}/>
    </div>
  );
}

function ProgressChart({ points, P, T }) {
  const W = 320, H = 110, padX = 12, padY = 12;
  const xs = points.map((_, i) => padX + (i * (W - 2 * padX)) / Math.max(1, points.length - 1));
  const maxY = Math.max(...points.map(p => p.max));
  const minY = Math.min(...points.map(p => p.max));
  const range = maxY - minY || 1;
  const ys = points.map(p => H - padY - ((p.max - minY) / range) * (H - 2 * padY));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const areaPath = `${path} L ${xs[xs.length - 1]} ${H - padY} L ${xs[0]} ${H - padY} Z`;
  const trend = points[points.length - 1].max - points[0].max;
  const pct = points[0].max > 0 ? Math.round((trend / points[0].max) * 100) : 0;

  return (
    <div style={{
      padding: '14px 16px', background: P.card, borderRadius: 16,
      border: `1px solid ${P.rule}`, boxShadow: P.shadow,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: P.text3, fontWeight: 500,
        }}>evolució 1RM</span>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: P.good, fontVariantNumeric: 'tabular-nums' }}>
          +{trend.toFixed(1)}kg (+{pct}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 96 }}>
        <defs>
          <linearGradient id="ssChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={P.accent} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={P.accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ssChartGrad)"/>
        <path d={path} fill="none" stroke={P.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4 : 2.4} fill={P.accent}/>
        ))}
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 9, color: P.text3, marginTop: 2,
      }}>
        <span>{points[0].day}</span>
        <span>{points[points.length - 1].max}kg · màx</span>
        <span>{points[points.length - 1].day}</span>
      </div>
    </div>
  );
}

function VolumeRow({ v, P, T, max }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontFamily: T.sans, color: P.text2 }}>{v.muscle}</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: T.mono, fontSize: 13, color: P.text, fontVariantNumeric: 'tabular-nums' }}>
            {(v.thisWeek / 1000).toFixed(2)}t
          </span>
          <span style={{
            fontFamily: T.mono, fontSize: 11,
            color: v.diff > 0 ? P.good : v.diff < 0 ? '#A04A30' : P.text3,
          }}>
            {v.diff > 0 ? '+' : ''}{v.diff}%
          </span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, background: P.cardHi, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${(v.lastWeek / max) * 100}%`, background: P.rule, borderRadius: 999,
        }}/>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${(v.thisWeek / max) * 100}%`, background: P.accent, opacity: 0.85, borderRadius: 999,
        }}/>
      </div>
    </div>
  );
}

function StatsScreen({ mode = 'light', accent = '#B14E2C', typography = 'plex' }) {
  const P = qlPalette(mode, accent);
  const T = TYPOGRAPHY_SYSTEMS[typography] || TYPOGRAPHY_SYSTEMS.plex;
  const [period, setPeriod] = React.useState('30');
  const [selectedEx, setSelectedEx] = React.useState('Press Banca');

  const maxImp = Math.max(...MUSCLE_STATS.map(s => Math.abs(s.improvement)), 1);
  const maxVol = Math.max(...WEEKLY_VOLUME.flatMap(v => [v.thisWeek, v.lastWeek]), 1);
  const totalImprovement = MUSCLE_STATS.filter(s => s.improvement > 0).reduce((sum, s) => sum + s.improvement, 0);
  const improved = MUSCLE_STATS.filter(s => s.improvement > 0).length;

  return (
    <div style={{
      height: '100%', background: P.bg, color: P.text,
      fontFamily: T.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 2 }}>
          el teu progrés
        </div>
        <h1 style={{
          margin: 0, fontFamily: T.display, fontWeight: T.displayWeight, fontSize: 32,
          letterSpacing: T.headingTracking, color: P.text, lineHeight: 1,
        }}>Estadístiques.</h1>
      </div>

      {/* Period filter */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4, background: P.cardHi,
          borderRadius: 999, border: `1px solid ${P.rule}`,
        }}>
          {[
            { k: '30', l: '1 mes' },
            { k: '90', l: '3 mesos' },
            { k: 'all', l: 'Tot' },
          ].map(p => (
            <button key={p.k} onClick={() => setPeriod(p.k)} style={{
              flex: 1, padding: '7px 0', borderRadius: 999,
              background: period === p.k ? P.card : 'transparent',
              border: period === p.k ? `1px solid ${P.rule}` : '1px solid transparent',
              color: period === p.k ? P.text : P.text2,
              fontFamily: T.sans, fontSize: 12, fontWeight: period === p.k ? 500 : 400,
              cursor: 'pointer', boxShadow: period === p.k ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}>{p.l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 110px' }}>
        {/* Top stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{
            padding: '12px 14px', background: P.card, border: `1px solid ${P.rule}`,
            borderRadius: 16, boxShadow: P.shadow,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 4 }}>
              millora total
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 30, fontWeight: 500,
              color: P.good, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>+{totalImprovement}<span style={{ fontSize: 16, color: P.text3 }}>%</span></div>
          </div>
          <div style={{
            padding: '12px 14px', background: P.card, border: `1px solid ${P.rule}`,
            borderRadius: 16, boxShadow: P.shadow,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.text3, marginBottom: 4 }}>
              grups millorats
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 30, fontWeight: 500,
              color: P.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>{improved}<span style={{ fontSize: 16, color: P.text3 }}>/{MUSCLE_STATS.length}</span></div>
          </div>
        </div>

        {/* Per muscle group */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 10,
          }}>per grup muscular</div>
          {MUSCLE_STATS.sort((a, b) => b.improvement - a.improvement).map((s, i) => (
            <MuscleBar key={s.id} stat={s} P={P} T={T} max={maxImp} idx={i}/>
          ))}
        </div>

        {/* Weekly volume */}
        <div style={{ marginBottom: 20, paddingTop: 16, borderTop: `1px solid ${P.rule}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: P.text3, fontWeight: 500,
            }}>volum setmanal</span>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: P.text3 }}>
              <span style={{ width: 6, height: 6, background: P.rule, display: 'inline-block', borderRadius: 6, marginRight: 4 }}/>
              ant
              <span style={{ width: 6, height: 6, background: P.accent, display: 'inline-block', borderRadius: 6, margin: '0 4px 0 10px' }}/>
              ara
            </span>
          </div>
          {WEEKLY_VOLUME.map(v => <VolumeRow key={v.muscle} v={v} P={P} T={T} max={maxVol}/>)}
        </div>

        {/* Exercise history */}
        <div style={{ paddingTop: 16, borderTop: `1px solid ${P.rule}` }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: P.text3, fontWeight: 500, marginBottom: 10,
          }}>historial per exercici</div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
            {EX_LIST.map(ex => (
              <button key={ex} onClick={() => setSelectedEx(ex)} style={{
                padding: '7px 12px', borderRadius: 999, flexShrink: 0,
                background: selectedEx === ex ? P.text : P.cardHi,
                color: selectedEx === ex ? (P.text === '#FAF7F0' ? '#0B0A09' : '#FFF') : P.text2,
                border: `1px solid ${selectedEx === ex ? P.text : P.rule}`,
                fontFamily: T.sans, fontSize: 12, fontWeight: selectedEx === ex ? 500 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{ex}</button>
            ))}
          </div>

          <ProgressChart points={CHART_POINTS} P={P} T={T}/>

          <div style={{ marginTop: 16 }}>
            {SESSION_HISTORY.map((s, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: P.card,
                border: `1px solid ${s.isPR ? P.accent : P.rule}`,
                borderRadius: 14, marginBottom: 8, boxShadow: P.shadow,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: T.sans, fontSize: 13, color: P.text2, display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {s.isPR && <span style={{
                      fontFamily: T.mono, fontSize: 9, padding: '2px 6px',
                      background: P.accent, color: '#FFF', borderRadius: 4, letterSpacing: '0.06em',
                    }}>PR</span>}
                    {s.date}
                  </span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: P.text3 }}>
                    1RM <span style={{ color: P.text, fontWeight: 500 }}>{s.max1RM}kg</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {s.sets.map((st, j) => (
                    <span key={j} style={{
                      fontFamily: T.mono, fontSize: 11, padding: '3px 8px',
                      background: P.cardHi, color: P.text2, borderRadius: 6,
                    }}>{st}</span>
                  ))}
                </div>
                {s.note && (
                  <div style={{
                    fontFamily: T.sans, fontStyle: 'italic', fontSize: 12,
                    color: P.text3, marginTop: 6,
                  }}>"{s.note}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <QLBottomNav P={P} T={T} active="stats"/>
      <DopamineStyles/>
    </div>
  );
}

Object.assign(window, { StatsScreen });
