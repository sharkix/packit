'use client'

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  Sun,
  ThermometerSnowflake,
  ThermometerSun,
  Umbrella,
  Wind,
} from 'lucide-react'
import type { ClimateRange, WeatherSummary } from '@/lib/types'
import { weatherCodeInfo } from '@/lib/weather'
import { useLang } from '@/lib/i18n'
import { Card, cx } from './ui'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  'sun-cloud': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

function fmtDay(dateStr: string, t: ReturnType<typeof useLang>['t']): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday]
  return `${days[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`
}

/** Compact daily forecast rail, used inside each leg card. */
export function WeatherStrip({
  weather,
  isLoading,
}: {
  weather: WeatherSummary | null | undefined
  isLoading: boolean
}) {
  const { t, lang } = useLang()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        {t.weatherLoading}…
      </div>
    )
  }

  if (!weather) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <ThermometerSun className="size-3.5 text-accent" aria-hidden="true" />
          {t.weatherDayAvg} <strong>{Math.round(weather.avgMax)} °C</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <ThermometerSnowflake className="size-3.5 text-sea" aria-hidden="true" />
          {t.weatherNight} <strong>{Math.round(weather.avgMin)} °C</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Umbrella className="size-3.5 text-sea" aria-hidden="true" />
          {rainyLabel(weather.rainyDays, t)}
        </span>
        {weather.windy && (
          <span className="flex items-center gap-1.5 text-warning">
            <Wind className="size-3.5" aria-hidden="true" />
            {lang === 'en' ? 'Windy' : 'Veterno'}
          </span>
        )}
        {weather.isEstimate && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent-foreground dark:text-accent">
            {t.weatherEstimate}
          </span>
        )}
      </div>

      <ul className="rail flex gap-1.5 overflow-x-auto pb-1">
        {weather.days.map((d) => {
          const info = weatherCodeInfo(d.code)
          const Icon = ICONS[info.icon] ?? Cloud
          return (
            <li
              key={d.date}
              className="flex min-w-15 shrink-0 flex-col items-center gap-0.5 rounded-lg border border-border bg-muted/60 px-2 py-2"
            >
              <span className="text-[10px] text-muted-foreground">{fmtDay(d.date, t)}</span>
              <Icon className="size-5 text-sea" aria-hidden="true" />
              <span className="sr-only">{lang === 'en' ? info.labelEn : info.label}</span>
              <span className="text-sm font-semibold tabular-nums">{Math.round(d.tMax)}°</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{Math.round(d.tMin)}°</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function rainyLabel(n: number, t: ReturnType<typeof useLang>['t']): string {
  if (n === 0) return t.weatherNoRain
  if (n === 1) return `${n} ${t.weatherRain1}`
  if (n <= 4) return `${n} ${t.weatherRain2}`
  return `${n} ${t.weatherRain5}`
}

/**
 * Whole-trip climate summary. On a moving trip the extremes matter far more
 * than any single destination's average, so this leads with the range.
 */
export function ClimateCard({ climate }: { climate: ClimateRange | null }) {
  const { t } = useLang()
  if (!climate) return null

  const bigSpread = climate.spread >= 14

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div>
          <p className="eyebrow text-muted-foreground">{t.weatherRange}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {Math.round(climate.minT)} °C → {Math.round(climate.maxT)} °C
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cx(
              'rounded-full px-2.5 py-1 font-semibold',
              bigSpread ? 'bg-accent/20 text-accent-foreground dark:text-accent' : 'bg-muted text-muted-foreground',
            )}
          >
            {t.weatherSpread} {climate.spread} °C
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
            {rainyLabel(climate.rainyDays, t)}
          </span>
          {climate.isEstimate && (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 font-medium text-accent-foreground dark:text-accent">
              {t.weatherEstimate}
            </span>
          )}
        </div>
      </div>

      {bigSpread && (
        <p className="border-t border-border bg-accent/10 px-4 py-2.5 text-xs text-accent-foreground sm:px-5 dark:text-accent">
          {t.layeringWarn}
        </p>
      )}
    </Card>
  )
}
