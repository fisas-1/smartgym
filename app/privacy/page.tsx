import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Polítiques de Privacitat - gym.',
  description: 'Polítiques de privacitat i ús de cookies',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-medium tracking-tight text-zinc-400">Polítiques de Privacitat</h1>
      </div>
      
      <div className="px-6 space-y-6 pb-20">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Ús de les Dades</h2>
          <p className="text-zinc-400 text-sm">
            Les teves dades (correu electrònic, nom d'usuari i registres d'entrenament) 
            s'utilitzen exclusivament per al funcionament de l'aplicació i no es compartiran 
            amb tercers sinó per complir amb obligacions legals.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Cookies</h2>
          <p className="text-zinc-400 text-sm">
            Utilitzem cookies tècniques essencials per mantenir la sessió d'usuari 
            i preferències (idioma, tema). No utilitzem cookies de seguiment ni publicitat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Supabase</h2>
          <p className="text-zinc-400 text-sm">
            Les dades es guarden a Supabase, que compleix amb el RGPD. 
            Pots sol·licitar la teva dreta d'eliminació contactant amb nosaltres.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Contacte</h2>
          <p className="text-zinc-400 text-sm">
            Per exercir els teus drets de privacitat, contacta a través de la pàgina 
            de suport de Vercel o l'adreça de contacte del projecte.
          </p>
        </section>
      </div>
    </div>
  )
}