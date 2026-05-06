import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">Pàgina no trobada</h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        La pàgina que busques no existeix o ha estat eliminada.
      </p>
      <Link 
        href="/" 
        className="px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity"
      >
        Tornar a l'inici
      </Link>
    </div>
  )
}