'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Luggage,
  Mountain,
  Building2,
  Waves,
  Sparkles,
  RotateCcw,
  Car,
  Compass,
  Map,
} from 'lucide-react'
import { DestinationAutocomplete } from './destination-autocomplete'
import { DateRangePicker } from './date-range-picker'
import { WeatherCard } from './weather-card'
import { PackingList } from './packing-list'
import { fetchWeather } from '@/lib/weather'
import { generatePackingList } from '@/lib/packing'
import type { GeoResult, Gender, PackItem, TripType } from '@/lib/types'
import { useLang } from '@/lib/i18n'

function useTripTypes(
  t: ReturnType<typeof useLang>['t'],
): { value: TripType; label: string; icon: typeof Waves }[] {
  return [
    { value: 'more', label: t.tripMore, icon: Waves },
    { value: 'hory', label: t.tripHory, icon: Mountain },
    { value: 'mesto', label: t.tripMesto, icon: Building2 },
  ]
}

export function TripPlanner() {
  const { t, lang, setLang } = useLang()
  const TRIP_TYPES = useTripTypes(t)
  const GENDERS: { value: Gender; label: string }[] = [
    { value: 'zena', label: t.genderWoman },
    { value: 'muz', label: t.genderMan },
    { value: 'neuvedene', label: t.genderUnspecified },
  ]

  const [destination, setDestination] = useState<GeoResult | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [gender, setGender] = useState<Gender>('neuvedene')
  const [tripTypes, setTripTypes] = useState<TripType[]>(['mesto'])
  const [tripTypesTouched, setTripTypesTouched] = useState(false)
  const [carRental, setCarRental] = useState(false)
  const [geocaching, setGeocaching] = useState(false)
  const [optionalTrip, setOptionalTrip] = useState(false)
  const [items, setItems] = useState<PackItem[] | null>(null)

  const {
    data: weather,
    isLoading: weatherLoading,
    error: weatherError,
  } = useSWR(
    destination && startDate && endDate
      ? ['weather', destination.latitude, destination.longitude, startDate, endDate]
      : null,
    ([, lat, lon, s, e]) => fetchWeather(lat, lon, s, e),
    { revalidateOnFocus: false },
  )

  function handleDestinationSelect(dest: GeoResult | null) {
    setDestination(dest)
    if (dest && !tripTypesTouched) {
      if ((dest.elevation ?? 0) >= 700) {
        setTripTypes(['hory'])
      } else if ((dest.elevation ?? 999) <= 30) {
        setTripTypes(['more', 'mesto'])
      } else {
        setTripTypes(['mesto'])
      }
    }
  }

  function toggleTripType(t: TripType) {
    setTripTypesTouched(true)
    setTripTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  const canGenerate = destination && startDate && endDate && !weatherLoading

  function generate() {
    if (!destination || !startDate || !endDate) return
    const list = generatePackingList({
      destination,
      startDate,
      endDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      gender,
      tripTypes,
      weather: weather ?? null,
      carRental,
      geocaching,
      optionalTrip,
    })
    setItems(list)
  }

  function reset() {
    setItems(null)
  }

  const tripDays =
    startDate && endDate
      ? Math.round(
          (new Date(endDate + 'T00:00:00').getTime() -
            new Date(startDate + 'T00:00:00').getTime()) /
            86400000,
        ) + 1
      : 0

  function dayLabel(n: number) {
    if (n === 1) return t.day
    if (n <= 4) return t.days2
    return t.days5
  }

  // ── Packlist view ──────────────────────────────────────────
  if (items) {
    return (
      <div className="flex flex-col gap-4">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-balance">
              {destination?.name}
              {destination?.country ? `, ${destination.country}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              {startDate && endDate
                ? `${new Date(startDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'sk-SK')} – ${new Date(endDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'sk-SK')}`
                : ''}
              {startTime ? ` · ${t.departure} ${startTime}` : ''}
              {endTime ? ` · ${t.returns} ${endTime}` : ''}
              {` · ${tripDays} ${dayLabel(tripDays)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t.editTrip}
            </button>
          </div>
        </div>

        <WeatherCard
          weather={weather}
          isLoading={weatherLoading}
          destinationName={destination?.name ?? ''}
        />

        <PackingList
          items={items}
          onToggle={(id) =>
            setItems(
              (prev) =>
                prev?.map((i) =>
                  i.id === id ? { ...i, checked: !i.checked } : i,
                ) ?? null,
            )
          }
          onDelete={(id) =>
            setItems((prev) => prev?.filter((i) => i.id !== id) ?? null)
          }
          onAdd={(category, name) =>
            setItems((prev) =>
              prev
                ? [
                    ...prev,
                    {
                      id: `c${Date.now()}`,
                      category,
                      name,
                      checked: false,
                      custom: true,
                    },
                  ]
                : null,
            )
          }
          onQtyChange={(id, qty) =>
            setItems(
              (prev) =>
                prev?.map((i) => (i.id === id ? { ...i, qty } : i)) ?? null,
            )
          }
        />
      </div>
    )
  }

  // ── Form view ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Language toggle in form */}
      <div className="flex justify-end">
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <DestinationAutocomplete
        selected={destination}
        onSelect={handleDestinationSelect}
      />

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        startTime={startTime}
        endTime={endTime}
        onChange={(v) => {
          setStartDate(v.startDate)
          setEndDate(v.endDate)
          setStartTime(v.startTime)
          setEndTime(v.endTime)
        }}
      />

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          {t.tripType}{' '}
          <span className="font-normal text-muted-foreground">
            {t.tripTypeHint}
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPES.map(({ value, label, icon: Icon }) => {
            const on = tripTypes.includes(value)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTripType(value)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.packFor}</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={gender === value}
              onClick={() => setGender(value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                gender === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Extras */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.extras}</legend>
        <div className="flex flex-col gap-2">
          <ExtraToggle
            icon={Car}
            label={t.carRental}
            note={t.carRentalNote}
            checked={carRental}
            onChange={setCarRental}
          />
          <ExtraToggle
            icon={Compass}
            label={t.geocaching}
            note={t.geocachingNote}
            checked={geocaching}
            onChange={setGeocaching}
          />
          <ExtraToggle
            icon={Map}
            label={t.optionalTrip}
            note={t.optionalTripNote}
            checked={optionalTrip}
            onChange={setOptionalTrip}
          />
        </div>
      </fieldset>

      {destination && startDate && endDate && (
        <WeatherCard
          weather={weather}
          isLoading={weatherLoading}
          destinationName={destination.name}
        />
      )}

      {weatherError != null && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t.weatherError}
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={!canGenerate}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {weatherLoading ? (
          <>
            <Luggage className="size-5" aria-hidden="true" />
            {t.generating}
          </>
        ) : (
          <>
            <Sparkles className="size-5" aria-hidden="true" />
            {t.generate}
          </>
        )}
      </button>
    </div>
  )
}

function ExtraToggle({
  icon: Icon,
  label,
  note,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
  label: string
  note: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
      checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#0e7c86]"
      />
      <span className="flex items-start gap-2">
        <Icon className={`mt-0.5 size-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{note}</span>
        </span>
      </span>
    </label>
  )
}

function LangToggle({ lang, setLang }: { lang: string; setLang: (l: 'sk' | 'en') => void }) {
  return (
    <div
      role="group"
      aria-label="Jazyk / Language"
      className="flex overflow-hidden rounded-lg border border-border bg-card text-sm font-medium"
    >
      {(['sk', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`px-3 py-1.5 transition-colors ${
            lang === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
