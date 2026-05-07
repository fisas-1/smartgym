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
  const [showPassword, setShowPassword] = useState(false)
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
     <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
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
               autoComplete="email"
             />
           </div>

           <div>
             <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Contrasenya</label>
             <div className="relative">
               <input
                 type={showPassword ? "text" : "password"}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="••••••••"
                 className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700 pr-10"
                 required
                 autoComplete="current-password"
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                 aria-label="Mostrar o amagar contrasenya"
               >
                 {showPassword ? '👁️' : '👁️‍🗨️'}
               </button>
             </div>
           </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Accedint...' : (isLogin ? 'Entrar' : 'Crear compte')}
          </button>
        </form>

         <div className="mt-4 space-y-2">
           {isLogin ? (
             <>
               <p className="text-sm text-zinc-500">No tens compte? Crea&apos;n un</p>
               <button
                 onClick={() => setIsLogin(false)}
                 className="w-full text-sm font-medium text-zinc-500 hover:text-white transition-colors"
               >
                 Registra&apos;t
               </button>
             </>
           ) : (
             <>
               <p className="text-sm text-zinc-500">Ja tens compte? Entra aquí</p>
               <button
                 onClick={() => setIsLogin(true)}
                 className="w-full text-sm font-medium text-zinc-500 hover:text-white transition-colors"
               >
                 Iniciar sessió
               </button>
             </>
           )}
         </div>
      </div>
    </div>
  )
}
