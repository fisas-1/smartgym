import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SmartGym',
  description: 'SmartGym application',
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-background p-8">
      <h1 className="text-3xl font-bold text-foreground">
        Welcome to SmartGym
      </h1>
      <p className="text-foreground/60">
        Your fitness journey starts here
      </p>
    </main>
  )
}