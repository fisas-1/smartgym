'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/LanguageContext'

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
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      setMyStats({
        id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'Tu',
        totalWorkouts: uniqueDays.size,
        consistency: Math.round((recentDays.size / 30) * 100),
        lastWorkout: logs[0]?.created_at || null,
      })
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

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
      volt: '⚡ Volt donat!',
      energia: '💉 Energia injectada!',
      motivar: '🐄 Moo-tivat!',
      empenyer: '🚀 Empès!',
    }
    setReactions(prev => ({ ...prev, [userId]: msgs[type] }))
    setTimeout(() => setReactions(prev => ({ ...prev, [userId]: null })), 2500)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#060913', color: '#F1F5F9' }}>
        <div className="text-center max-w-sm space-y-6">
          <h1 className="text-3xl font-black" style={{ color: '#00F0FF' }}>amics.</h1>
          <p className="text-sm" style={{ color: '#475569' }}>{t('friends.searchToSeeRanking')}</p>
          <a
            href="/login"
            className="inline-block py-4 px-8 rounded-2xl font-bold text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#00F0FF', color: '#060913' }}
          >
            {t('common.login')}
          </a>
        </div>
      </div>
    )
  }

  const allUsers = myStats ? [myStats, ...results.filter(u => u.id !== myStats.id)] : results
  const sorted = [...allUsers].sort((a, b) => b.consistency - a.consistency)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#060913', color: '#F1F5F9' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-10 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#F1F5F9' }}>
          amics<span style={{ color: '#00F0FF' }}>.</span>
        </h1>
        <p className="text-xs uppercase tracking-widest mt-0.5 font-bold" style={{ color: '#334155' }}>
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
            className="flex-1 text-sm rounded-2xl px-4 py-3 outline-none transition-colors"
            style={{ backgroundColor: '#101626', color: '#F1F5F9', border: '1px solid #1E293B' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(0,240,255,0.4)')}
            onBlur={e => (e.target.style.borderColor = '#1E293B')}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-30 active:scale-95"
            style={{ backgroundColor: '#00F0FF', color: '#060913' }}
            aria-label="Search"
          >
            {searching ? '…' : '🔍'}
          </button>
        </div>

        {/* ── Rànquing ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 px-1 font-bold" style={{ color: '#334155' }}>
            {t('friends.ranking')}
          </p>

          {sorted.length === 0 ? (
            <div
              className="py-8 rounded-2xl text-center"
              style={{ backgroundColor: '#101626', border: '1px solid #1E293B' }}
            >
              <p className="text-sm" style={{ color: '#334155' }}>{t('friends.searchToSeeRanking')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((u, idx) => {
                const isMe = myStats && u.id === myStats.id
                const days = daysSince(u.lastWorkout)
                const isDanger = !isMe && days >= 3
                const isHot = !isMe && u.consistency >= 60 && days <= 3
                const medal = MEDAL[idx] ?? null

                // Colors de la targeta
                const cardBorder = isMe
                  ? 'rgba(0,240,255,0.3)'
                  : isDanger
                    ? 'rgba(255,100,0,0.3)'
                    : '#1E293B'
                const cardBg = isMe
                  ? 'rgba(0,240,255,0.05)'
                  : isDanger
                    ? 'rgba(255,80,0,0.05)'
                    : '#101626'

                return (
                  <div
                    key={u.id}
                    className="rounded-2xl px-4 pt-4 pb-3 relative overflow-hidden"
                    style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                  >
                    {/* Línia superior de color per "jo" */}
                    {isMe && (
                      <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)' }}
                      />
                    )}

                    {/* Fila principal */}
                    <div className="flex items-start gap-3">
                      {/* Rang */}
                      <span className="text-sm tabular-nums font-bold w-6 text-center flex-shrink-0 mt-1" style={{ color: '#334155' }}>
                        {medal ?? idx + 1}
                      </span>

                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 select-none"
                        style={{
                          backgroundColor: isMe ? 'rgba(0,240,255,0.15)' : '#1E293B',
                          color: isMe ? '#00F0FF' : '#475569',
                          border: `1px solid ${isMe ? 'rgba(0,240,255,0.3)' : '#2D3748'}`,
                        }}
                      >
                        {u.username[0]?.toUpperCase()}
                      </div>

                      {/* Nom + info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold truncate" style={{ color: '#F1F5F9' }}>{u.username}</p>
                          {isMe && (
                            <span
                              className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: 'rgba(0,240,255,0.15)', color: '#00F0FF' }}
                            >
                              {t('friends.youLabel')}
                            </span>
                          )}
                          {isHot && (
                            <span
                              className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: 'rgba(0,240,255,0.1)', color: '#00F0FF', border: '1px solid rgba(0,240,255,0.25)' }}
                            >
                              ⚡ {t('friends.onStreak')}
                            </span>
                          )}
                          {isDanger && (
                            <span
                              className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: 'rgba(255,80,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,80,0,0.3)' }}
                            >
                              ⚠️ {days === 999 ? t('friends.noActivity') : t('friends.daysInactive', { days: String(days) })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                          {u.lastWorkout
                            ? new Date(u.lastWorkout).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                            : t('friends.noActivity')}
                        </p>
                      </div>

                      {/* Consistència */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-xl font-black tabular-nums"
                          style={{
                            color: u.consistency >= 70
                              ? '#00F0FF'
                              : u.consistency >= 40
                                ? '#F1F5F9'
                                : '#334155',
                          }}
                        >
                          {u.consistency}<span className="text-sm font-bold">%</span>
                        </p>
                        <p className="text-[9px] uppercase tracking-wider" style={{ color: '#334155' }}>
                          {t('friends.consistency')}
                        </p>
                      </div>
                    </div>

                    {/* Barra de consistència */}
                    <div className="mt-3 mx-9" style={{ paddingLeft: '3rem' }}>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1E293B' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${u.consistency}%`,
                            background: u.consistency >= 70
                              ? 'linear-gradient(90deg, #00F0FF, #0066FF)'
                              : u.consistency >= 40
                                ? 'linear-gradient(90deg, #a855f7, #6366f1)'
                                : '#334155',
                          }}
                        />
                      </div>
                    </div>

                    {/* Feedback de reacció */}
                    {reactions[u.id] && (
                      <p
                        className="mt-2 text-xs font-bold text-center"
                        style={{ color: '#00F0FF' }}
                      >
                        {reactions[u.id]}
                      </p>
                    )}

                    {/* ── Botó d'acció ── */}
                    {!isMe && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleReaction(u.id, 'motivar')}
                          className="w-full py-2 rounded-xl text-xs font-black transition-all duration-200 hover:scale-105 active:scale-95"
                          style={{
                            backgroundColor: 'rgba(0,240,255,0.08)',
                            color: '#00F0FF',
                            border: '1px solid rgba(0,240,255,0.2)',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget
                            el.style.backgroundColor = '#00F0FF'
                            el.style.color = '#060913'
                            el.style.borderColor = '#00F0FF'
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget
                            el.style.backgroundColor = 'rgba(0,240,255,0.08)'
                            el.style.color = '#00F0FF'
                            el.style.borderColor = 'rgba(0,240,255,0.2)'
                          }}
                        >
                          {t('friends.mootivate')}
                        </button>
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
