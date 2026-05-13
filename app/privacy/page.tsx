import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacitat — gym.',
  description: 'Política de privacitat i ús de cookies',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-24 max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
            ← gym.
          </Link>
          <h1 className="mt-4 text-2xl font-light tracking-tight">Política de Privacitat</h1>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">Última actualització: maig 2025</p>
        </div>

        <section className="space-y-2">
          <h2 className="section-label">Qui som</h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            gym. és una aplicació de seguiment d'entrenaments personal. Les dades que recollim serveixen exclusivament per fer funcionar l'app i millorar la teva experiència. No les venem ni les cedim a tercers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="section-label">Quines dades recollim</h2>
          <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Adreça de correu electrònic (per al compte)</li>
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Nom d'usuari (visible a la secció d'amics)</li>
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Registres d'entrenament (exercicis, pes, repeticions)</li>
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Dades de perfil opcionals (edat, alçada, pes, gènere)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="section-label">Per a què les fem servir</h2>
          <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Guardar i mostrar el teu historial d'entrenaments</li>
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Calcular estadístiques i progressió de força</li>
            <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">—</span>Permetre comparar consistència amb altres usuaris</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="section-label">Cookies</h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Utilitzem únicament cookies essencials per mantenir la sessió activa i guardar les teves preferències (idioma, tema). No fem servir cookies de publicitat ni de seguiment de tercers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="section-label">Els teus drets</h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Pots sol·licitar l'eliminació del teu compte i totes les dades associades en qualsevol moment des de la pàgina de Perfil. La infraestructura de dades (Supabase) compleix amb el RGPD europeu i totes les connexions van xifrades via HTTPS.
          </p>
        </section>

      </div>
    </div>
  )
}
