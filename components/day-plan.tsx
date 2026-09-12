'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Backpack,
  CalendarDays,
  Loader2,
  MapPin,
  Shirt,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import type { AiItineraryResult } from '@/app/api/ai-itinerary/route'
import type { TripConfig } from '@/lib/types'
import { useLang } from '@/lib/i18n'
import { weatherCodeInfo } from '@/lib/weather'
import { Card, Eyebrow, cx } from './ui'

const INTENSITY_TONE: Record<string, string> = {
  oddych: 'bg-success/15 text-success',
  stredna: 'bg-sea/15 text-sea',
  narocna: 'bg-accent/20 text-accent-foreground dark:text-accent',
}

export function DayPlan({ cfg }: { cfg: TripConfig }) {
  const { t, locale, lang } = useLang()
  const [plan, setPlan] = useState<AiItineraryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeDay, setActiveDay] = useState(0)

  async function generate() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) throw new Error('itinerary failed')
      const data: AiItineraryResult = await res.json()
      setPlan(data)
      setActiveDay(0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const day = plan?.days[activeDay]
  const leg = day ? cfg.legs.find((l) => l.id === day.legId) : undefined
  const dayWeather = leg?.weather?.days.find((d) => d.date === day?.date)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{t.dayPlan}</Eyebrow>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">{t.dayPlanHint}</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-full border border-primary bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {loading ? t.dayPlanLoading : plan ? t.regenerate : t.dayPlanGenerate}
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {t.dayPlanError}
        </p>
      )}

      {plan && plan.days.length > 0 && (
        <Card className="overflow-hidden">
          {/* Day rail */}
          <div className="rail flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2.5">
            {plan.days.map((d, i) => {
              const date = new Date(d.date + 'T00:00:00')
              return (
                <button
                  key={`${d.date}-${i}`}
                  type="button"
                  onClick={() => setActiveDay(i)}
                  aria-current={i === activeDay}
                  className={cx(
                    'flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                    i === activeDay
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase opacity-80">
                    {date.toLocaleDateString(locale, { weekday: 'short' })}
                  </span>
                  <span className="tabular-nums">
                    {date.getDate()}.{date.getMonth() + 1}.
                  </span>
                </button>
              )
            })}
          </div>

          {day && (
            <div className="grid gap-px bg-border sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="flex flex-col gap-3 bg-muted/40 px-4 py-4 sm:px-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-sea">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {new Date(day.date + 'T00:00:00').toLocaleDateString(locale, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-balance">
                    {day.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {leg?.destination && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" aria-hidden="true" />
                      {leg.destination.name}
                    </span>
                  )}
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 font-semibold',
                      INTENSITY_TONE[day.intensity] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {day.intensity === 'oddych'
                      ? t.intensityOddych
                      : day.intensity === 'narocna'
                        ? t.intensityNarocna
                        : t.intensityStredna}
                  </span>
                  {dayWeather && (
                    <span className="rounded-full bg-card px-2 py-0.5 font-semibold tabular-nums text-muted-foreground">
                      {Math.round(dayWeather.tMin)}–{Math.round(dayWeather.tMax)} °C ·{' '}
                      {lang === 'en'
                        ? weatherCodeInfo(dayWeather.code).labelEn
                        : weatherCodeInfo(dayWeather.code).label}
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{day.summary}</p>
              </div>

              <div className="flex flex-col gap-4 bg-card px-4 py-4 sm:px-5">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Shirt className="size-3.5" aria-hidden="true" />
                    {t.dayOutfit}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-pretty">{day.outfit}</p>
                </div>

                {day.dayBag.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <Backpack className="size-3.5" aria-hidden="true" />
                      {t.dayBag}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {day.dayBag.map((it, i) => (
                        <li
                          key={i}
                          className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {day.watchOut && (
                  <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="font-bold">{t.dayWatchOut}: </strong>
                      {day.watchOut}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {plan.packingImplications.length > 0 && (
            <div className="border-t border-border bg-primary/5 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {t.dayPackingImplications}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {plan.packingImplications.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-pretty">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </section>
  )
}
