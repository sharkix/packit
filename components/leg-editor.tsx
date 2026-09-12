'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import {
  Bus,
  CalendarDays,
  ChevronDown,
  Footprints,
  Hotel,
  Home,
  MoreHorizontal,
  Mountain,
  Plane,
  Plus,
  Ship,
  Tent,
  TrainFront,
  Trash2,
  Car,
  BedDouble,
} from 'lucide-react'
import { ACTIVITIES } from '@/lib/activities'
import { legDays } from '@/lib/packing'
import { useLang } from '@/lib/i18n'
import type { Accommodation, ActivityKind, GeoResult, TransportMode, TripLeg } from '@/lib/types'
import { DestinationAutocomplete } from './destination-autocomplete'
import { WeatherStrip } from './weather-card'
import { Card, Chip, Eyebrow, cx, inputClass } from './ui'

const TRANSPORTS: { value: TransportMode; icon: typeof Plane; key: 'transportPlane' | 'transportCar' | 'transportTrain' | 'transportBus' | 'transportFerry' | 'transportWalk' | 'transportOther' }[] = [
  { value: 'lietadlo', icon: Plane, key: 'transportPlane' },
  { value: 'auto', icon: Car, key: 'transportCar' },
  { value: 'vlak', icon: TrainFront, key: 'transportTrain' },
  { value: 'autobus', icon: Bus, key: 'transportBus' },
  { value: 'trajekt', icon: Ship, key: 'transportFerry' },
  { value: 'peso', icon: Footprints, key: 'transportWalk' },
  { value: 'ine', icon: MoreHorizontal, key: 'transportOther' },
]

const ACCOMS: { value: Accommodation; icon: typeof Hotel; key: 'accomHotel' | 'accomPrivat' | 'accomHostel' | 'accomKemp' | 'accomChata' | 'accomOther' }[] = [
  { value: 'hotel', icon: Hotel, key: 'accomHotel' },
  { value: 'privat', icon: Home, key: 'accomPrivat' },
  { value: 'hostel', icon: BedDouble, key: 'accomHostel' },
  { value: 'kemp', icon: Tent, key: 'accomKemp' },
  { value: 'chata', icon: Mountain, key: 'accomChata' },
  { value: 'ine', icon: MoreHorizontal, key: 'accomOther' },
]

const ICON_MAP = Icons as unknown as Record<
  string,
  React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
>

export function LegEditor({
  legs,
  onChange,
  weatherLoading,
}: {
  legs: TripLeg[]
  onChange: (legs: TripLeg[]) => void
  weatherLoading: Record<string, boolean>
}) {
  const { t, lang } = useLang()

  function update(id: string, patch: Partial<TripLeg>) {
    onChange(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function addLeg() {
    const last = legs[legs.length - 1]
    // A new stop starts the day the previous one ends — that is how a moving
    // trip actually works, and it saves the user two taps.
    const start = last?.endDate || ''
    const end = start ? addDays(start, 2) : ''
    onChange([
      ...legs,
      {
        id: `leg${Date.now()}`,
        destination: null,
        startDate: start,
        endDate: end,
        transport: last ? 'vlak' : 'lietadlo',
        accommodation: 'hotel',
        activities: [],
      },
    ])
  }

  function removeLeg(id: string) {
    onChange(legs.filter((l) => l.id !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Eyebrow>{t.legs}</Eyebrow>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{t.legsHint}</p>
      </div>

      <ol className="flex flex-col gap-4">
        {legs.map((leg, idx) => (
          <li key={leg.id}>
            <LegCard
              leg={leg}
              index={idx}
              isFirst={idx === 0}
              canRemove={legs.length > 1}
              loadingWeather={!!weatherLoading[leg.id]}
              onChange={(patch) => update(leg.id, patch)}
              onRemove={() => removeLeg(leg.id)}
              t={t}
              lang={lang}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={addLeg}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-card/60 px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t.addLeg}
      </button>
    </div>
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function LegCard({
  leg,
  index,
  isFirst,
  canRemove,
  loadingWeather,
  onChange,
  onRemove,
  t,
  lang,
}: {
  leg: TripLeg
  index: number
  isFirst: boolean
  canRemove: boolean
  loadingWeather: boolean
  onChange: (patch: Partial<TripLeg>) => void
  onRemove: () => void
  t: ReturnType<typeof useLang>['t']
  lang: 'sk' | 'en'
}) {
  const [open, setOpen] = useState(!leg.destination)
  const days = legDays(leg)

  function pickDestination(dest: GeoResult | null) {
    const patch: Partial<TripLeg> = { destination: dest, weather: null }
    if (dest && leg.activities.length === 0) {
      patch.activities = suggestFor(dest)
    }
    onChange(patch)
  }

  function toggleActivity(a: ActivityKind) {
    onChange({
      activities: leg.activities.includes(a)
        ? leg.activities.filter((x) => x !== a)
        : [...leg.activities, a],
    })
  }

  return (
    <Card className="overflow-hidden">
      {/* Summary row — always visible so a long route stays scannable */}
      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate font-display text-lg font-semibold">
            {leg.destination?.name ?? `${t.leg} ${index + 1}`}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {leg.destination?.country && <span>{leg.destination.country}</span>}
            {days > 0 && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" aria-hidden="true" />
                {days} {lang === 'en' ? (days === 1 ? t.day : t.days2) : days === 1 ? t.day : days <= 4 ? t.days2 : t.days5}
              </span>
            )}
            {leg.activities.length > 0 && (
              <span className="truncate">
                {leg.activities
                  .map((a) => ACTIVITIES.find((x) => x.value === a)?.[lang === 'en' ? 'en' : 'sk'])
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t.removeLeg}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={leg.destination?.name ?? `${t.leg} ${index + 1}`}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-5 border-t border-border px-4 py-4 sm:px-5">
          <DestinationAutocomplete
            id={`dest-${leg.id}`}
            selected={leg.destination}
            onSelect={pickDestination}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`from-${leg.id}`} className="text-sm font-semibold">
                {t.dateFrom}
              </label>
              <input
                id={`from-${leg.id}`}
                type="date"
                value={leg.startDate}
                max={leg.endDate || undefined}
                onChange={(e) => {
                  const v = e.target.value
                  onChange({
                    startDate: v,
                    endDate: leg.endDate && leg.endDate < v ? v : leg.endDate,
                    weather: null,
                  })
                }}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`to-${leg.id}`} className="text-sm font-semibold">
                {t.dateTo}
              </label>
              <input
                id={`to-${leg.id}`}
                type="date"
                value={leg.endDate}
                min={leg.startDate || undefined}
                onChange={(e) => onChange({ endDate: e.target.value, weather: null })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Activities */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {t.activities}{' '}
              <span className="font-normal text-muted-foreground">{t.activitiesHint}</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITIES.map((a) => {
                const Icon = ICON_MAP[a.icon] ?? Mountain
                return (
                  <Chip
                    key={a.value}
                    size="sm"
                    icon={Icon}
                    active={leg.activities.includes(a.value)}
                    onClick={() => toggleActivity(a.value)}
                    title={lang === 'en' ? a.enHint : a.skHint}
                  >
                    {lang === 'en' ? a.en : a.sk}
                  </Chip>
                )
              })}
            </div>
          </fieldset>

          {/* Transport */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              {isFirst ? t.transport : `${t.transport} (${index}. → ${index + 1}.)`}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {TRANSPORTS.map(({ value, icon, key }) => (
                <Chip
                  key={value}
                  size="sm"
                  icon={icon}
                  active={leg.transport === value}
                  onClick={() => onChange({ transport: value })}
                >
                  {t[key]}
                </Chip>
              ))}
            </div>
            {leg.transport === 'ine' && (
              <input
                type="text"
                value={leg.transportOther ?? ''}
                onChange={(e) => onChange({ transportOther: e.target.value })}
                placeholder={t.transportOtherPlaceholder}
                className={cx(inputClass, 'mt-2')}
              />
            )}
          </fieldset>

          {/* Accommodation */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t.accommodation}</legend>
            <div className="flex flex-wrap gap-1.5">
              {ACCOMS.map(({ value, icon, key }) => (
                <Chip
                  key={value}
                  size="sm"
                  icon={icon}
                  active={leg.accommodation === value}
                  onClick={() => onChange({ accommodation: value })}
                >
                  {t[key]}
                </Chip>
              ))}
            </div>
            {leg.accommodation === 'ine' && (
              <input
                type="text"
                value={leg.accommodationOther ?? ''}
                onChange={(e) => onChange({ accommodationOther: e.target.value })}
                placeholder={t.accomOtherPlaceholder}
                className={cx(inputClass, 'mt-2')}
              />
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`notes-${leg.id}`} className="text-sm font-semibold">
              {t.legNotes}
            </label>
            <textarea
              id={`notes-${leg.id}`}
              rows={2}
              value={leg.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder={t.legNotesPlaceholder}
              className={cx(inputClass, 'resize-y')}
            />
          </div>

          <WeatherStrip weather={leg.weather} isLoading={loadingWeather} />
        </div>
      )}
    </Card>
  )
}

function suggestFor(dest: GeoResult): ActivityKind[] {
  const el = dest.elevation ?? 300
  if (el >= 700) return ['hiking', 'photo']
  if (el <= 30) return ['city', 'beach', 'hiking']
  return ['city', 'hiking']
}
