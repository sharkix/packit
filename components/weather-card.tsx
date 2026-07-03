'use client'

import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  CloudDrizzle,
  Loader2,
  ThermometerSun,
  ThermometerSnowflake,
  Umbrella,
} from 'lucide-react'
import type { WeatherSummary } from '@/lib/types'
import { weatherCodeInfo } from '@/lib/weather'

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

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][d.getDay()]
  return `${dow} ${d.getDate()}.${d.getMonth() + 1}.`
}

export function WeatherCard({
  weather,
  isLoading,
  destinationName,
}: {
  weather: WeatherSummary | null | undefined
  isLoading: boolean
  destinationName: string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Loader2
          className="size-5 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="text-sm text-muted-foreground">
          Zisťujem počasie v destinácii {destinationName}…
        </span>
      </div>
    )
  }

  if (!weather) return null

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Počasie · {destinationName}</h3>
        {weather.isEstimate && (
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            Odhad podľa minulého roka
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <ThermometerSun
            className="size-4 text-accent"
            aria-hidden="true"
          />
          Priemer cez deň{' '}
          <strong>{Math.round(weather.avgMax)}°C</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <ThermometerSnowflake
            className="size-4 text-primary"
            aria-hidden="true"
          />
          V noci <strong>{Math.round(weather.avgMin)}°C</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Umbrella className="size-4 text-primary" aria-hidden="true" />
          {weather.rainyDays === 0
            ? 'Bez daždivých dní'
            : `${weather.rainyDays} ${weather.rainyDays === 1 ? 'daždivý deň' : weather.rainyDays <= 4 ? 'daždivé dni' : 'daždivých dní'}`}
        </span>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1">
        {weather.days.map((d) => {
          const info = weatherCodeInfo(d.code)
          const Icon = ICONS[info.icon] ?? Cloud
          return (
            <li
              key={d.date}
              className="flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-md bg-muted px-2 py-2.5"
            >
              <span className="text-xs text-muted-foreground">
                {fmtDay(d.date)}
              </span>
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <span className="sr-only">{info.label}</span>
              <span className="text-sm font-semibold">
                {Math.round(d.tMax)}°
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(d.tMin)}°
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
