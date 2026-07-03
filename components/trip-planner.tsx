'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Luggage, Mountain, Building2, Waves, Sparkles, RotateCcw } from 'lucide-react'
import { DestinationAutocomplete } from './destination-autocomplete'
import { DateRangePicker } from './date-range-picker'
import { WeatherCard } from './weather-card'
import { PackingList } from './packing-list'
import { fetchWeather } from '@/lib/weather'
import { generatePackingList } from '@/lib/packing'
import type { GeoResult, Gender, PackItem, TripType } from '@/lib/types'

const TRIP_TYPES: { value: TripType; label: string; icon: typeof Waves }[] = [
  { value: 'more', label: 'More a pláž', icon: Waves },
  { value: 'hory', label: 'Hory', icon: Mountain },
  { value: 'mesto', label: 'Mesto', icon: Building2 },
]

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'zena', label: 'Žena' },
  { value: 'muz', label: 'Muž' },
  { value: 'neuvedene', label: 'Nechcem uviesť' },
]

export function TripPlanner() {
  const [destination, setDestination] = useState<GeoResult | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [gender, setGender] = useState<Gender>('neuvedene')
  const [tripTypes, setTripTypes] = useState<TripType[]>(['mesto'])
  const [tripTypesTouched, setTripTypesTouched] = useState(false)
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
      // Auto-suggest trip type based on destination elevation
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

  if (items) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-balance">
              {destination?.name}
              {destination?.country ? `, ${destination.country}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              {startDate && endDate
                ? `${new Date(startDate + 'T00:00:00').toLocaleDateString('sk-SK')} – ${new Date(endDate + 'T00:00:00').toLocaleDateString('sk-SK')}`
                : ''}
              {startTime ? ` · odchod ${startTime}` : ''}
              {endTime ? ` · návrat ${endTime}` : ''}
              {` · ${tripDays} ${tripDays === 1 ? 'deň' : tripDays <= 4 ? 'dni' : 'dní'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Upraviť cestu
          </button>
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
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
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
          Typ cesty{' '}
          <span className="font-normal text-muted-foreground">
            (navrhnuté podľa destinácie — uprav podľa potreby)
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
        <legend className="mb-1.5 text-sm font-semibold">Balím pre</legend>
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

      {destination && startDate && endDate && (
        <WeatherCard
          weather={weather}
          isLoading={weatherLoading}
          destinationName={destination.name}
        />
      )}

      {weatherError != null && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Počasie sa nepodarilo načítať — packlist vygenerujeme bez neho.
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={!canGenerate}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {weatherLoading ? (
          <>
            <Luggage className="size-5" aria-hidden="true" />
            Zisťujem počasie…
          </>
        ) : (
          <>
            <Sparkles className="size-5" aria-hidden="true" />
            Vygenerovať packlist
          </>
        )}
      </button>
    </div>
  )
}
