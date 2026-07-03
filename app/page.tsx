import { Luggage } from 'lucide-react'
import { TripPlanner } from '@/components/trip-planner'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-4 sm:py-6">
      <header className="mb-5 flex items-center gap-3 sm:mb-8">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:size-12">
          <Luggage className="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">Zbalené?</h1>
          <p className="text-xs text-muted-foreground text-pretty sm:text-sm">
            Zadaj destináciu a termín — my zistíme počasie a zbalíme ťa.
          </p>
        </div>
      </header>

      <TripPlanner />
    </main>
  )
}
