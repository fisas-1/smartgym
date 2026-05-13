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

export default function AmicsPage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<FriendStats[]>([])
  const [searching, setSearching] = useState(false)
  const [myStats, setMyStats] = useState<FriendStats | null>(null)

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

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-6">
          <h1 className="text-3xl font-light">amics.</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm">{t('friends.searchToSeeRanking')}</p>
           <a href="/login" className="inline-block py-4 px-8 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity">
             {t('common.login')}
           </a>
        </div>
      </div>
    )
  }

  const allUsers = myStats ? [myStats, ...results.filter(u => u.id !== myStats.id)] : results
  const sorted = [...allUsers].sort((a, b) => b.consistency - a.consistency)

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-4 max-w-2xl mx-auto">
        <h1 className="page-title">amics.</h1>
      </div>

      <div className="px-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('friends.searchUser')}
            className="flex-1 bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm rounded-full px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] rounded-full text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            aria-label="Search"
          >
            {searching ? '…' : '🔍'}
          </button>
        </div>

        <div>
          <p className="section-label mb-3">{t('friends.ranking')}</p>
          <div className="space-y-1">
            {sorted.length === 0 ? (
              <p className="text-[var(--color-text-tertiary)] text-sm py-2">{t('friends.searchToSeeRanking')}</p>
            ) : (
              sorted.map((u, idx) => {
                const isMe = myStats && u.id === myStats.id
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                return (
                  <div key={u.id} className={`flex items-center gap-3 py-3 px-3 rounded-xl border-b border-[var(--border)] ${isMe ? 'bg-[var(--surface)]' : ''}`}>
                    <span className="text-[var(--color-text-tertiary)] text-sm w-6 text-center tabular-nums">{medal || (idx + 1)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-light truncate flex items-center gap-2">
                        {u.username}
                        {isMe && <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">tu</span>}
                      </p>
                      <p className="text-[var(--color-text-tertiary)] text-xs">
                        {u.lastWorkout
                          ? new Date(u.lastWorkout).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                          : t('friends.noActivity')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-light tabular-nums" style={{ color: u.consistency >= 70 ? 'var(--accent-success)' : u.consistency >= 40 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{u.consistency}%</p>
                      <p className="text-[var(--color-text-tertiary)] text-[10px] uppercase tracking-wider">{t('friends.consistency')}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}
