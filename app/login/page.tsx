'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, signIn, signUp } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, username)

    setLoading(false)

    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-light mb-8 text-center">
          gym.
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Usuari</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'usuari"
                className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                required
              />
            </div>
          )}

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
            />
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Contrasenya</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Accedint...' : (isLogin ? 'Entrar' : 'Crear compte')}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          {isLogin
            ? "No tens compte? Crea'n un"
            : "Ja tens compte? Entra aquí"
          }
        </button>
      </div>
    </div>
  )
}
