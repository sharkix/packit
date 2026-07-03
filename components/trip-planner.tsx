'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Plane,
  TrainFront,
  Bus,
  MoreHorizontal,
  Hotel,
  Home,
  Tent,
  ListChecks,
} from 'lucide-react'
import { DestinationAutocomplete } from './destination-autocomplete'
import { DateRangePicker } from './date-range-picker'
import { WeatherCard } from './weather-card'
import { PackingList } from './packing-list'
import { LuggagePicker } from './luggage-picker'
import { AiStatus } from './ai-status'
import { CountryInfoCard } from './country-info-card'
import { fetchWeather } from '@/lib/weather'
import { generatePackingList, legacyLuggageToPieces } from '@/lib/packing'
import type { GeoResult, Gender, PackItem, TripType, LuggageType, LuggagePiece, FlightInfo, CountryInfo, TransportMode, Accommodation } from '@/lib/types'
import type { AiPacklistResult } from '@/app/api/ai-packlist/route'
import type { AiLookupResult } from '@/app/api/ai-lookup/route'
import { useLang } from '@/lib/i18n'

const STORAGE_KEY = 'zbalene_v1'

interface PersistedState {
  destination: GeoResult | null
  startDate: string | null
  endDate: string | null
  startTime: string
  endTime: string
  gender: Gender
  tripTypes: TripType[]
  carRental: boolean
  geocaching: boolean
  optionalTrip: boolean
  luggageType: LuggageType        // legacy — kept so old saves still load
  luggagePieces?: LuggagePiece[]  // preferred multi-select model
  flightNumber: string
  flightInfo: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  countryInfo: CountryInfo | null
  items: PackItem[] | null
  transport?: TransportMode
  transportOther?: string
  accommodation?: Accommodation
  accommodationOther?: string
  view?: 'form' | 'list'
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedState) : null
  } catch {
    return null
  }
}

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

  // ── Initialise from localStorage ────────────────────────────
  const [hydrated, setHydrated] = useState(false)
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
  const [luggagePieces, setLuggagePieces] = useState<LuggagePiece[]>(['kabinova'])
  const [flightNumber, setFlightNumber] = useState('')
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null)
  const [hasPriority, setHasPriority] = useState(false)
  const [hasPaidBag, setHasPaidBag] = useState(false)
  const [items, setItems] = useState<PackItem[] | null>(null)
  const [transport, setTransport] = useState<TransportMode>('lietadlo')
  const [transportOther, setTransportOther] = useState('')
  const [accommodation, setAccommodation] = useState<Accommodation>('hotel')
  const [accommodationOther, setAccommodationOther] = useState('')
  const [view, setView] = useState<'form' | 'list'>('form')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [aiResult, setAiResult] = useState<AiPacklistResult | null>(null)
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null)
  const [countryInfoLoading, setCountryInfoLoading] = useState(false)

  // Hydrate from localStorage on first client render
  useEffect(() => {
    const saved = loadPersistedState()
    if (saved) {
      if (saved.destination) setDestination(saved.destination)
      if (saved.startDate) setStartDate(saved.startDate)
      if (saved.endDate) setEndDate(saved.endDate)
      if (saved.startTime) setStartTime(saved.startTime)
      if (saved.endTime) setEndTime(saved.endTime)
      if (saved.gender) setGender(saved.gender)
      if (saved.tripTypes?.length) setTripTypes(saved.tripTypes)
      setCarRental(saved.carRental ?? false)
      setGeocaching(saved.geocaching ?? false)
      setOptionalTrip(saved.optionalTrip ?? false)
      if (saved.luggagePieces?.length) {
        setLuggagePieces(saved.luggagePieces)
      } else if (saved.luggageType) {
        // Migrate legacy single-select to the new multi-piece model
        setLuggagePieces(legacyLuggageToPieces(saved.luggageType))
      }
      if (saved.flightNumber) setFlightNumber(saved.flightNumber)
      if (saved.flightInfo) setFlightInfo(saved.flightInfo)
      setHasPriority(saved.hasPriority ?? false)
      setHasPaidBag(saved.hasPaidBag ?? false)
      if (saved.countryInfo) setCountryInfo(saved.countryInfo)
      if (saved.items) setItems(saved.items)
      if (saved.transport) setTransport(saved.transport)
      if (saved.transportOther) setTransportOther(saved.transportOther)
      if (saved.accommodation) setAccommodation(saved.accommodation)
      if (saved.accommodationOther) setAccommodationOther(saved.accommodationOther)
      // Restore view — if a list exists, go straight back to it
      if (saved.items && saved.view !== 'form') setView('list')
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever relevant state changes
  const persist = useCallback(() => {
    if (!hydrated) return
    const state: PersistedState = {
      destination,
      startDate,
      endDate,
      startTime,
      endTime,
      gender,
      tripTypes,
      carRental,
      geocaching,
      optionalTrip,
      luggageType: 'kufor-maly', // legacy field, superseded by luggagePieces
      luggagePieces,
      flightNumber,
      flightInfo,
      hasPriority,
      hasPaidBag,
      countryInfo,
      items,
      transport,
      transportOther,
      accommodation,
      accommodationOther,
      view,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch { /* quota exceeded — ignore */ }
  }, [hydrated, destination, startDate, endDate, startTime, endTime, gender, tripTypes, carRental, geocaching, optionalTrip, luggagePieces, flightNumber, flightInfo, hasPriority, hasPaidBag, countryInfo, items, transport, transportOther, accommodation, accommodationOther, view])

  useEffect(() => {
    persist()
  }, [persist])

  // ── Weather ──────────────────────────────────────────────────
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

  // ── AI Lookup ────────────────────────────────────────────────
  function triggerAiLookup(dest: GeoResult | null, fNumber?: string, fInfo?: FlightInfo | null, prio?: boolean, paidBag?: boolean) {
    if (!dest) {
      setCountryInfo(null)
      return
    }
    setCountryInfoLoading(true)
    const iata = fInfo?.iata ?? (fNumber ? fNumber.replace(/\d+.*/, '').trim().toUpperCase() : undefined)
    fetch('/api/ai-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode: dest.country_code,
        country: dest.country,
        destination: dest.name,
        flightIata: iata,
        flightNumber: fNumber || undefined,
        hasPriority: prio ?? hasPriority,
        hasPaidBag: paidBag ?? hasPaidBag,
        luggagePieces,
        lang,
      }),
    })
      .then((r) => r.json() as Promise<AiLookupResult>)
      .then((result) => {
        const ci: CountryInfo = {
          currency: result.currency,
          currencySymbol: result.currencySymbol,
          cashTip: result.cashTip,
          plugAdapter: result.plugAdapter,
          visaNote: result.visaNote,
          safetyNote: result.safetyNote,
          healthTips: result.healthTips,
          localTips: result.localTips,
          emergencyNumber: result.emergencyNumber,
          baggageInfo: result.baggageInfo
            ? {
                airline: result.baggageInfo.airline,
                cabinSize: result.baggageInfo.cabinSize,
                cabinWeightKg: result.baggageInfo.cabinWeightKg,
                checkedWeightKg: result.baggageInfo.checkedWeightKg,
                priorityNote: result.baggageInfo.priorityNote,
                confidence: result.baggageInfo.confidence,
              }
            : undefined,
        }
        setCountryInfo(ci)
        setCountryInfoLoading(false)
      })
      .catch(() => {
        setCountryInfoLoading(false)
      })
  }

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
    triggerAiLookup(dest, flightNumber, flightInfo)
  }

  function toggleTripType(type: TripType) {
    setTripTypesTouched(true)
    setTripTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    )
  }

  const canGenerate = destination && startDate && endDate && !weatherLoading

  // ── Generate packlist ────────────────────────────────────────
  function generate() {
    if (!destination || !startDate || !endDate) return

    const cfg = {
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
      luggageType: 'kufor-maly' as LuggageType, // legacy, superseded by luggagePieces
      luggagePieces,
      flightNumber: flightNumber || undefined,
      flightInfo: flightInfo ?? undefined,
      hasPriority,
      hasPaidBag,
      countryInfo: countryInfo ?? null,
      transport,
      transportOther: transportOther || undefined,
      accommodation,
      accommodationOther: accommodationOther || undefined,
    }

    const baseList = generatePackingList(cfg)
    setItems(baseList)
    setView('list')
    setAiResult(null)
    setAiStatus('loading')

    fetch('/api/ai-packlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
      .then((r) => {
        if (!r.ok) throw new Error('API error')
        return r.json() as Promise<AiPacklistResult>
      })
      .then((result) => {
        setAiResult(result)
        setAiStatus('done')
        setItems((prev) => {
          if (!prev) return prev
          const removed = new Set(result.removals.map((n) => n.toLowerCase()))
          let merged = prev.filter((i) => !removed.has(i.name.toLowerCase()))
          const highlighted = new Set(result.highlights.map((n) => n.toLowerCase()))
          merged = merged.map((i) =>
            highlighted.has(i.name.toLowerCase()) ? { ...i, highlight: true } : i,
          )
          const additions: PackItem[] = result.additions.map((a, idx) => ({
            id: `ai${idx}`,
            category: a.category,
            name: a.name,
            qty: a.qty,
            note: a.note,
            checked: false,
            aiAdded: true,
            highlight: highlighted.has(a.name.toLowerCase()),
          }))
          return [...merged, ...additions]
        })
      })
      .catch(() => {
        setAiStatus('error')
      })
  }

  // "Upraviť cestu" — switch to form WITHOUT losing the checked list
  function editTrip() {
    setView('form')
  }

  function backToList() {
    setView('list')
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

  // ── Packlist view ────────────────────────────────────────────
  if (items && view === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {/* Header — stacks on mobile, row on sm+ */}
        <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-balance sm:text-xl">
              {destination?.name}
              {destination?.country ? `, ${destination.country}` : ''}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {startDate && endDate
                ? `${new Date(startDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'sk-SK')} – ${new Date(endDate + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : 'sk-SK')}`
                : ''}
              {startTime ? ` · ${t.departure} ${startTime}` : ''}
              {endTime ? ` · ${t.returns} ${endTime}` : ''}
              {` · ${tripDays} ${dayLabel(tripDays)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            <button
              type="button"
              onClick={editTrip}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t.editTrip}
            </button>
          </div>
        </div>

        <AiStatus
          status={aiStatus}
          reasoning={aiResult?.reasoning}
          weatherNote={aiResult?.weatherNote}
          lang={lang}
        />

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
                prev?.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) ?? null,
            )
          }
          onDelete={(id) =>
            setItems((prev) => prev?.filter((i) => i.id !== id) ?? null)
          }
          onAdd={(category, name) =>
            setItems((prev) =>
              prev
                ? [...prev, { id: `c${Date.now()}`, category, name, checked: false, custom: true }]
                : null,
            )
          }
          onQtyChange={(id, qty) =>
            setItems(
              (prev) => prev?.map((i) => (i.id === id ? { ...i, qty } : i)) ?? null,
            )
          }
        />
      </div>
    )
  }

  // ── Form view ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        {items ? (
          <button
            type="button"
            onClick={backToList}
            className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <ListChecks className="size-4" aria-hidden="true" />
            {t.backToList}
          </button>
        ) : (
          <span />
        )}
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <DestinationAutocomplete
        selected={destination}
        onSelect={handleDestinationSelect}
      />

      {/* Transport mode — fundamental choice, affects the whole list */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.transport}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'lietadlo', label: t.transportPlane, icon: Plane },
              { value: 'auto', label: t.transportCar, icon: Car },
              { value: 'vlak', label: t.transportTrain, icon: TrainFront },
              { value: 'autobus', label: t.transportBus, icon: Bus },
              { value: 'ine', label: t.transportOther, icon: MoreHorizontal },
            ] as { value: TransportMode; label: string; icon: typeof Plane }[]
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={transport === value}
              onClick={() => setTransport(value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                transport === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {transport === 'ine' && (
          <input
            type="text"
            value={transportOther}
            onChange={(e) => setTransportOther(e.target.value)}
            placeholder={t.transportOtherPlaceholder}
            className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        )}
      </fieldset>

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

      {(countryInfo || countryInfoLoading) && (
        <CountryInfoCard
          info={countryInfo}
          isLoading={countryInfoLoading}
          lang={lang}
        />
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          {t.tripType}{' '}
          <span className="font-normal text-muted-foreground">{t.tripTypeHint}</span>
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

      {/* Accommodation type */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.accommodation}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'hotel', label: t.accomHotel, icon: Hotel },
              { value: 'privat', label: t.accomPrivat, icon: Home },
              { value: 'kemp', label: t.accomKemp, icon: Tent },
              { value: 'ine', label: t.accomOther, icon: MoreHorizontal },
            ] as { value: Accommodation; label: string; icon: typeof Hotel }[]
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={accommodation === value}
              onClick={() => setAccommodation(value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                accommodation === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {accommodation === 'ine' && (
          <input
            type="text"
            value={accommodationOther}
            onChange={(e) => setAccommodationOther(e.target.value)}
            placeholder={t.accomOtherPlaceholder}
            className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        )}
      </fieldset>

      {/* Luggage & flight — only relevant when flying */}
      {transport === 'lietadlo' && (
        <LuggagePicker
          luggagePieces={luggagePieces}
          flightNumber={flightNumber}
          flightInfo={flightInfo}
          hasPriority={hasPriority}
          hasPaidBag={hasPaidBag}
          onChange={(v) => {
            setLuggagePieces(v.luggagePieces)
            setFlightNumber(v.flightNumber)
            setFlightInfo(v.flightInfo)
            setHasPriority(v.hasPriority)
            setHasPaidBag(v.hasPaidBag)
            if (v.flightInfo?.iata !== flightInfo?.iata || v.flightNumber !== flightNumber) {
              triggerAiLookup(destination, v.flightNumber, v.flightInfo, v.hasPriority, v.hasPaidBag)
            }
          }}
        />
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">{t.extras}</legend>
        <div className="flex flex-col gap-2">
          <ExtraToggle icon={Car} label={t.carRental} note={t.carRentalNote} checked={carRental} onChange={setCarRental} />
          <ExtraToggle icon={Compass} label={t.geocaching} note={t.geocachingNote} checked={geocaching} onChange={setGeocaching} />
          <ExtraToggle icon={Map} label={t.optionalTrip} note={t.optionalTripNote} checked={optionalTrip} onChange={setOptionalTrip} />
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

      <div className="flex flex-col gap-2">
        {items && (
          <p className="text-center text-xs text-muted-foreground text-pretty">
            {t.regenerateWarn}
          </p>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 active:opacity-80"
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
        className="mt-0.5 size-5 shrink-0 accent-[#0e7c86]"
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
