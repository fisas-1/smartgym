'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../contexts/LanguageContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showForgotUsername, setShowForgotUsername] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [usernameReminderSent, setUsernameReminderSent] = useState(false)
  const { user, signIn, signUp, resetPassword } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()

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
      if (result.error.includes('Invalid login credentials')) {
        setError(t('login.invalidCredentials'))
      } else {
        setError(result.error)
      }
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('login.enterEmail'))
      return
    }
    setError(null)
    setLoading(true)
    const result = await resetPassword(email)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setResetEmailSent(true)
    }
  }

  async function handleForgotUsername(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('login.enterEmail'))
      return
    }
    setError(null)
    setLoading(true)
    // Send a reminder email via Supabase (same endpoint as password reset with a hint in the redirect)
    const { error } = await fetch('/api/remind-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => r.json())
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      setUsernameReminderSent(true)
    }
  }

  function renderForgotPasswordForm() {
    if (resetEmailSent) {
      return (
        <div className="text-center">
          <p className="text-green-400 text-sm mb-4">
            {t('login.resetPassword')}<br />
            {t('login.resetPasswordHint')}
          </p>
          <button
            onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setEmail(''); }}
            className="text-sm text-[var(--color-text-primary)]/60 hover:text-[var(--color-text-primary)] underline"
          >
            ← {t('common.cancel')}
          </button>
        </div>
      )
    }
    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <p className="text-sm text-zinc-400 mb-2">
          {t('login.resetPasswordHint')}
        </p>
        <div>
          <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
            required
            autoComplete="email"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowForgotPassword(false); setError(null) }}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('common.send')}
          </button>
        </div>
      </form>
    )
  }

  function renderForgotUsernameForm() {
    if (usernameReminderSent) {
      return (
        <div className="text-center">
          <p className="text-green-400 text-sm mb-4">
            {t('login.usernameReminderSent')}
          </p>
          <button
            onClick={() => { setShowForgotUsername(false); setUsernameReminderSent(false); setEmail(''); }}
            className="text-sm text-[var(--color-text-primary)]/60 hover:text-[var(--color-text-primary)] underline"
          >
            ← {t('common.cancel')}
          </button>
        </div>
      )
    }
    return (
      <form onSubmit={handleForgotUsername} className="space-y-4">
        <p className="text-sm text-zinc-400 mb-2">
          {t('login.resetUsernameHint')}
        </p>
        <div>
          <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
            required
            autoComplete="email"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowForgotUsername(false); setError(null) }}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('common.send')}
          </button>
        </div>
      </form>
    )
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-light mb-4 text-center text-[var(--color-text-primary)]">gym.</h1>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8">
            <h3 className="text-lg font-light text-white mb-4">{t('login.resetPassword')}</h3>
            {renderForgotPasswordForm()}
          </div>
        </div>
      </div>
    )
  }

  if (showForgotUsername) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-light mb-4 text-center text-[var(--color-text-primary)]">
            gym.
          </h1>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8">
            <h3 className="text-lg font-light text-white mb-4">{t('login.reminderUsername')}</h3>
            {renderForgotUsernameForm()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-light mb-4 text-center text-[var(--color-text-primary)]">
          gym.
        </h1>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8">
          <div className="flex mb-6 bg-zinc-900 rounded-full p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                isLogin ? 'bg-white text-black' : 'text-zinc-400'
              }`}
            >
              {t('common.login')}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                !isLogin ? 'bg-white text-black' : 'text-zinc-400'
              }`}
            >
              {t('common.register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">{t('login.username')}</label>
               <input
                 type="text"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 placeholder={t('login.placeholderUsername')}
                 className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                required
                />
            </div>

            {!isLogin && (
              <div>
                <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                  required
                  autoComplete="email"
                />
              </div>
            )}

            {isLogin && (
              <div>
                <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
                  required
                  autoComplete="email"
                />
              </div>
            )}

            <div>
               <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">{t('login.password')}</label>
               <div className="relative">
                 <input
                   type={showPassword ? "text" : "password"}
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••"
                   className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)] pr-10"
                   required
                   autoComplete={isLogin ? "current-password" : "new-password"}
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
                   aria-label={t('login.togglePassword')}
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
               className="w-full py-4 rounded-2xl font-medium bg-[var(--card)] text-[var(--card-foreground)] hover:opacity-90 disabled:opacity-50 transition-colors min-h-[44px]"
            >
               {loading ? (isLogin ? t('login.loggingIn') : t('login.registering')) : (isLogin ? t('common.login') : t('common.register'))}
            </button>
          </form>

          {/* Enllaços de recuperació */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              onClick={() => { setShowForgotPassword(true); setError(null) }}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] underline"
            >
              {t('login.forgotPassword')}
            </button>
            <button
              onClick={() => { setShowForgotUsername(true); setError(null) }}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] underline"
            >
              {t('login.forgotUsername')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
