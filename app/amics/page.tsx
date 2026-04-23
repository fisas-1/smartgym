'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type FriendStats = {
  id: string
  username: string
  totalSets: number
  consistency: number
  lastWorkout: string | null
}

export default function AmicsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<FriendStats[]>([])
  const [searching, setSearching] = useState(false)
  const [myStats, setMyStats] = useState<FriendStats | null>(null)

  useEffect(() => {
    loadMyStats()
  }, [])

  async function loadMyStats() {
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('created_at')
      .order('created_at', { ascending: false })

    if (logs) {
      const uniqueDays = new Set(logs.map(l => new Date(l.created_at).toDateString()))
      const last30 = new Date()
      last30.setDate(last30.getDate() - 30)
      const recentDays = new Set(
        logs.filter(l => new Date(l.created_at) >= last30)
            .map(l => new Date(l.created_at).toDateString())
      )

      setMyStats({
        id: 'me',
        username: 'Tu',
        totalSets: uniqueDays.size,
        consistency: Math.round((recentDays.size / 30) * 100),
        lastWorkout: logs[0]?.created_at || null,
      })
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('created_at')
      .order('created_at', { ascending: false })

    if (logs) {
      const uniqueDays = new Set(logs.map(l => new Date(l.created_at).toDateString()))
      const last30 = new Date()
      last30.setDate(last30.getDate() - 30)
      const recentDays = new Set(
        logs.filter(l => new Date(l.created_at) >= last30)
            .map(l => new Date(l.created_at).toDateString())
      )

      setResults([{
        id: '1',
        username: searchQuery.trim(),
        totalSets: uniqueDays.size,
        consistency: Math.round((recentDays.size / 30) * 100),
        lastWorkout: logs[0]?.created_at || null,
      }])
    }
    setSearching(false)
  }

  const allUsers = myStats ? [myStats, ...results] : results
  const sorted = [...allUsers].sort((a, b) => b.consistency - a.consistency)

  return (
    <div className="min-h-screen bg-black text-white">
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
            {sorted.map((user, idx) => (
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
            ))}
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}