'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/LanguageContext'

// ── Paleta ──────────────────────────────────────────────
const C = {
  bg:      '#050505',
  surface: '#121212',
  border:  '#222222',
  text:    '#FAFAF7',
  muted:   '#555555',
  faint:   '#1A1A1A',
  accent:  '#E8FF1A',
  danger:  '#FF4444',
  warn:    '#FF6B00',
} as const

type FriendStats = {
  id: string
  username: string
  totalWorkouts: number
  consistency: number
  lastWorkout: string | null
}

function daysSince(lastWorkout: string | null): number {
  if (!lastWorkout) return 999
  const diff = Date.now() - new Date(lastWorkout).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

export default function AmicsPage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<FriendStats[]>([])
  const [searching, setSearching] = useState(false)
  const [myStats, setMyStats] = useState<FriendStats | null>(null)
  const [reactions, setReactions] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (user) {
      loadMyStats()
    } else {
      setMyStats(null)
    }
  }, [user])

  async function loadMyStats() {
    if (!user) return

    const { data: logs } = await supabase
      .from('workout_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (logs && logs.length > 0) {
      const uniqueDays = new Set(logs.map(l => new Date(l.created_at).toDateString()))
      const last30 = new Date()
      last30.setDate(last30.getDate() - 30)
      const recentDays = new Set(
        logs.filter(l => new Date(l.created_at) >= last30)
            .map(l => new Date(l.created_at).toDateString())
      )
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single()
      setMyStats({
        id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'Tu',
        totalWorkouts: uniqueDays.size,
        consistency: Math.round((recentDays.size / 30) * 100),
        lastWorkout: logs[0]?.created_at || null,
      })
    } else {
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single()
      setMyStats({
        id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'Tu',
        totalWorkouts: 0,
        consistency: 0,
        lastWorkout: null,
      })
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${searchQuery.trim()}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      setSearching(false)
      return
    }

    if (profiles && profiles.length > 0) {
      const usersWithStats = await Promise.all(profiles.map(async (profile) => {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        const uniqueDays = new Set(logs?.map(l => new Date(l.created_at).toDateString()) || [])
        const last30 = new Date()
        last30.setDate(last30.getDate() - 30)
        const recentDays = new Set(
          (logs || []).filter(l => new Date(l.created_at) >= last30)
                     .map(l => new Date(l.created_at).toDateString())
        )
        return {
          id: profile.id,
          username: profile.username,
          totalWorkouts: uniqueDays.size,
          consistency: Math.round((recentDays.size / 30) * 100),
          lastWorkout: logs && logs.length > 0 ? logs[0].created_at : null,
        }
      }))
      setResults(usersWithStats)
    } else {
      setResults([])
    }
    setSearching(false)
  }

  function handleReaction(userId: string, type: 'volt' | 'energia' | 'motivar' | 'empenyer') {
    const msgs: Record<string, string> = {
      volt:     '⚡ Volt donat!',
      energia:  '💉 Energia injectada!',
      motivar:  '🐄 Moo-tivat!',
      empenyer: '🚀 Empès!',
    }
    setReactions(prev => ({ ...prev, [userId]: msgs[type] }))
    setTimeout(() => setReactions(prev => ({ ...prev, [userId]: null })), 2500)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
           style={{ backgroundColor: C.bg, color: C.text }}>
        <div className="text-center max-w-sm space-y-6">
          <h1 className="text-3xl font-black" style={{ color: C.accent }}>amics.</h1>
          <p className="text-sm" style={{ color: C.muted }}>{t('friends.searchToSeeRanking')}</p>
          <a href="/login"
             className="inline-block py-4 px-8 rounded-2xl font-black text-sm transition-opacity hover:opacity-80"
             style={{ backgroundColor: C.accent, color: C.bg }}>
            {t('common.login')}
          </a>
        </div>
      </div>
    )
  }

  const allUsers = myStats ? [myStats, ...results.filter(u => u.id !== myStats.id)] : results
  const sorted = [...allUsers].sort((a, b) => b.consistency - a.consistency)

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <div className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>
          amics<span style={{ color: C.accent }}>.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest mt-0.5 font-black" style={{ color: C.muted }}>
          {t('friends.feedSubtitle')}
        </p>
      </div>

      <div className="px-6 space-y-5 max-w-2xl mx-auto">

        {/* ── Cerca ── */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('friends.searchUser')}
            className="flex-1 text-sm rounded-2xl px-4 py-3 outline-none transition-all"
            style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
            onFocus={e => (e.target.style.borderColor = C.accent + '66')}
            onBlur={e => (e.target.style.borderColor = C.border)}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-3 rounded-2xl text-sm font-black transition-all hover:opacity-80 disabled:opacity-30 active:scale-95"
            style={{ backgroundColor: C.accent, color: C.bg }}
            aria-label="Search"
          >
            {searching ? '…' : '🔍'}
          </button>
        </div>

        {/* ── Rànquing ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 px-1 font-black" style={{ color: C.muted }}>
            {t('friends.ranking')}
          </p>

          {sorted.length === 0 ? (
            <div className="py-10 rounded-2xl text-center"
                 style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-sm" style={{ color: C.muted }}>{t('friends.searchToSeeRanking')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((u, idx) => {
                const isMe = myStats && u.id === myStats.id
                const days = daysSince(u.lastWorkout)
                const isDanger = !isMe && days >= 3
                const isHot = !isMe && u.consistency >= 60 && days <= 3
                const medal = MEDAL[idx] ?? null

                const cardBorder = isMe
                  ? C.accent + '44'
                  : isDanger
                    ? C.warn + '44'
                    : C.border

                const cardBg = isMe
                  ? C.accent + '08'
                  : isDanger
                    ? C.warn + '08'
                    : C.surface

                // Color consistència
                const consistencyColor = u.consistency >= 70
                  ? C.accent
                  : u.consistency >= 40
                    ? C.text
                    : C.muted

                return (
                  <div
                    key={u.id}
                    className="rounded-2xl px-4 pt-4 pb-3 relative overflow-hidden"
                    style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                  >
                    {/* Línia superior per a "jo" */}
                    {isMe && (
                      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                           style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
                    )}

                    {/* Línia superior perill */}
                    {isDanger && !isMe && (
                      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                           style={{ background: `linear-gradient(90deg, transparent, ${C.warn}, transparent)` }} />
                    )}

                    {/* Fila principal */}
                    <div className="flex items-start gap-3">

                      {/* Rang */}
                      <span className="text-sm tabular-nums font-black w-6 text-center flex-shrink-0 mt-1"
                            style={{ color: C.muted }}>
                        {medal ?? idx + 1}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 select-none"
                           style={{
                             backgroundColor: isMe ? C.accent + '20' : C.faint,
                             color: isMe ? C.accent : C.muted,
                             border: `1px solid ${isMe ? C.accent + '44' : C.border}`,
                           }}>
                        {u.username[0]?.toUpperCase()}
                      </div>

                      {/* Nom + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-black truncate" style={{ color: C.text }}>{u.username}</p>

                          {isMe && (
                            <span className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                                  style={{ backgroundColor: C.accent + '20', color: C.accent }}>
                              {t('friends.youLabel')}
                            </span>
                          )}
                          {isHot && (
                            <span className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                                  style={{ backgroundColor: C.accent + '15', color: C.accent, border: `1px solid ${C.accent}30` }}>
                              ⚡ {t('friends.onStreak')}
                            </span>
                          )}
                          {isDanger && (
                            <span className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                                  style={{ backgroundColor: C.warn + '20', color: C.warn, border: `1px solid ${C.warn}40` }}>
                              ⚠️ {days === 999 ? t('friends.noActivity') : t('friends.daysInactive', { days: String(days) })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                          {u.lastWorkout
                            ? new Date(u.lastWorkout).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                            : t('friends.noActivity')}
                        </p>
                      </div>

                      {/* Consistència */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black tabular-nums" style={{ color: consistencyColor }}>
                          {u.consistency}<span className="text-sm font-bold">%</span>
                        </p>
                        <p className="text-[9px] uppercase tracking-wider" style={{ color: C.muted }}>
                          {t('friends.consistency')}
                        </p>
                      </div>
                    </div>

                    {/* Barra de consistència */}
                    <div className="mt-3" style={{ paddingLeft: '3.75rem' }}>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                        <div className="h-full rounded-full transition-all duration-700"
                             style={{
                               width: `${u.consistency}%`,
                               backgroundColor: u.consistency >= 70
                                 ? C.accent
                                 : u.consistency >= 40
                                   ? '#a855f7'
                                   : C.muted,
                             }} />
                      </div>
                    </div>

                    {/* Feedback reacció */}
                    {reactions[u.id] && (
                      <p className="mt-2 text-xs font-black text-center" style={{ color: C.accent }}>
                        {reactions[u.id]}
                      </p>
                    )}

                    {/* ── Botons d'acció ── */}
                    {!isMe && (
                      <div className="mt-3 flex gap-2">
                        {isDanger ? (
                          <>
                            {/* Moo-tivar */}
                            <ActionButton
                              label={t('friends.mootivate')}
                              baseColor={C.warn}
                              onClick={() => handleReaction(u.id, 'motivar')}
                            />
                            {/* Empènyer */}
                            <ActionButton
                              label={t('friends.pushThem')}
                              baseColor={C.danger}
                              onClick={() => handleReaction(u.id, 'empenyer')}
                            />
                          </>
                        ) : (
                          <>
                            {/* Donar Volt */}
                            <ActionButton
                              label={t('friends.giveVolt')}
                              baseColor={C.accent}
                              darkText
                              onClick={() => handleReaction(u.id, 'volt')}
                            />
                            {/* Injectar Energia */}
                            <ActionButton
                              label={t('friends.injectEnergy')}
                              baseColor="#a855f7"
                              onClick={() => handleReaction(u.id, 'energia')}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}

// ── Component botó d'acció reutilitzable ────────────────
function ActionButton({
  label,
  baseColor,
  darkText = false,
  onClick,
}: {
  label: string
  baseColor: string
  darkText?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-xl text-xs font-black transition-all duration-150 hover:scale-[1.03] active:scale-95"
      style={{
        backgroundColor: baseColor + '15',
        color: baseColor,
        border: `1px solid ${baseColor}33`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.backgroundColor = baseColor
        el.style.color = darkText ? '#050505' : '#FAFAF7'
        el.style.borderColor = baseColor
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.backgroundColor = baseColor + '15'
        el.style.color = baseColor
        el.style.borderColor = baseColor + '33'
      }}
    >
      {label}
    </button>
  )
}
