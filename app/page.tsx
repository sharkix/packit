import { Luggage } from 'lucide-react'
import { TripPlanner } from '@/components/trip-planner'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6">
      <header className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Luggage className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Zbalené?</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Zadaj destináciu a termín — my zistíme počasie a zbalíme ťa.
          </p>
        </div>
      </header>

      <TripPlanner />
    </main>
  )
}
