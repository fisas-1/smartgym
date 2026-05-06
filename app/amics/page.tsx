'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type FriendStats = {
  id: string
  username: string
  totalWorkouts: number
  consistency: number
  lastWorkout: string | null
}

export default function AmicsPage() {
  const { user } = useAuth()
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
        <div className="text-center">
          <h1 className="text-3xl font-light mb-8">amics.</h1>
          <p className="text-zinc-500 mb-8">Inicia sessió per veure el ranking</p>
           <a href="/login" className="inline-block py-4 px-8 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-colors">
             Entrar
           </a>
        </div>
      </div>
    )
  }

  const allUsers = myStats ? [myStats, ...results.filter(u => u.id !== myStats.id)] : results
  const sorted = [...allUsers].sort((a, b) => b.consistency - a.consistency)

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-medium tracking-tight text-zinc-400">amics.</h1>
      </div>

      <div className="px-6 space-y-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar usuari..."
            className="flex-1 bg-zinc-900 text-sm rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-3 bg-zinc-900 rounded-full text-sm"
          >
            {searching ? '...' : '🔍'}
          </button>
        </div>

        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Ranking</p>
          <div className="space-y-2">
            {sorted.length === 0 ? (
              <p className="text-zinc-600 text-sm">Cerca usuaris per veure el ranking</p>
            ) : (
              sorted.map((user, idx) => (
                <div key={user.id} className="flex items-center gap-4 py-3 border-b border-zinc-900">
                  <span className="text-zinc-600 text-sm w-4">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-light">{user.username}</p>
                    <p className="text-zinc-600 text-xs">
                      {user.lastWorkout 
                        ? new Date(user.lastWorkout).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })
                        : 'Sense activitat'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-light">{user.consistency}%</p>
                    <p className="text-zinc-600 text-xs">consistència</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}
