'use client'

import { useState } from 'react'
import { Backpack, Briefcase, Luggage, Search, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import type { LuggageType, FlightInfo } from '@/lib/types'
import { lookupFlightBaggage, POPULAR_AIRLINES } from '@/lib/flight'
import { useLang } from '@/lib/i18n'

interface LuggagePickerProps {
  luggageType: LuggageType
  flightNumber: string
  flightInfo: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  onChange: (v: {
    luggageType: LuggageType
    flightNumber: string
    flightInfo: FlightInfo | null
    hasPriority: boolean
    hasPaidBag: boolean
  }) => void
}

const LUGGAGE_OPTIONS: { value: LuggageType; icon: typeof Backpack; skLabel: string; enLabel: string; skDesc: string; enDesc: string }[] = [
  {
    value: 'ruksak',
    icon: Backpack,
    skLabel: 'Len ruksak',
    enLabel: 'Backpack only',
    skDesc: 'Ako osobná batožina do kabíny',
    enDesc: 'Personal item in the cabin',
  },
  {
    value: 'ruksak+kabinka',
    icon: Briefcase,
    skLabel: 'Batoh + kabínkový kufrík',
    enLabel: 'Backpack + cabin bag',
    skDesc: 'Malý batoh pod sedadlo + kabínkový kufrík',
    enDesc: 'Small bag under seat + cabin-size carry-on',
  },
  {
    value: 'kufor-maly',
    icon: Luggage,
    skLabel: 'Malý kufrík (kabína)',
    enLabel: 'Small suitcase (cabin)',
    skDesc: 'Kabínový kufrík do priestoru nad hlavou',
    enDesc: 'Carry-on suitcase in the overhead bin',
  },
  {
    value: 'kufor-velky',
    icon: Luggage,
    skLabel: 'Veľký kufrík (odbavený)',
    enLabel: 'Large suitcase (checked)',
    skDesc: 'Odbavená batožina do podpalubí',
    enDesc: 'Checked baggage in the hold',
  },
]

export function LuggagePicker({
  luggageType,
  flightNumber,
  flightInfo,
  hasPriority,
  hasPaidBag,
  onChange,
}: LuggagePickerProps) {
  const { t, lang } = useLang()
  const [inputFlight, setInputFlight] = useState(flightNumber)
  const [loading, setLoading] = useState(false)
  const [showAirlines, setShowAirlines] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const needsCheckedBag = luggageType === 'kufor-velky'

  function emit(partial: Partial<Parameters<typeof onChange>[0]>) {
    onChange({
      luggageType,
      flightNumber,
      flightInfo,
      hasPriority,
      hasPaidBag,
      ...partial,
    })
  }

  function handleLuggage(v: LuggageType) {
    emit({ luggageType: v })
  }

  async function handleFlightLookup() {
    const raw = inputFlight.trim()
    if (!raw) {
      emit({ flightNumber: '', flightInfo: null })
      setNotFound(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    // Lookup from local DB (no external API needed)
    await new Promise((r) => setTimeout(r, 300)) // UX delay
    const info = lookupFlightBaggage(raw, hasPriority, hasPaidBag)
    setLoading(false)
    if (info) {
      emit({ flightNumber: raw, flightInfo: info })
      setNotFound(false)
    } else {
      emit({ flightNumber: raw, flightInfo: null })
      setNotFound(true)
    }
  }

  function handleFlightInput(val: string) {
    setInputFlight(val)
    if (!val.trim()) {
      emit({ flightNumber: '', flightInfo: null })
      setNotFound(false)
    }
  }

  function handlePriority(v: boolean) {
    // Re-run lookup with updated priority flag so bag sizes update
    const info = flightNumber ? lookupFlightBaggage(flightNumber, v, hasPaidBag) : null
    emit({ hasPriority: v, flightInfo: info })
  }

  function handlePaidBag(v: boolean) {
    const info = flightNumber ? lookupFlightBaggage(flightNumber, hasPriority, v) : null
    emit({ hasPaidBag: v, flightInfo: info })
  }

  function pickAirline(iata: string) {
    const fake = `${iata}001`
    setInputFlight(fake)
    setShowAirlines(false)
    const info = lookupFlightBaggage(fake, hasPriority, hasPaidBag)
    emit({ flightNumber: fake, flightInfo: info })
    setNotFound(!info)
  }

  const isLargeIcon = (v: LuggageType) => v === 'kufor-velky'

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-0.5 text-sm font-semibold">
        {lang === 'sk' ? 'Batožina' : 'Luggage'}
      </legend>

      {/* Luggage type selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LUGGAGE_OPTIONS.map(({ value, icon: Icon, skLabel, enLabel, skDesc, enDesc }) => {
          const active = luggageType === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => handleLuggage(value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-colors ${
                active
                  ? 'border-primary bg-primary/8 font-semibold text-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <Icon
                className={`${isLargeIcon(value) ? 'size-6' : 'size-5'} ${active ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className="leading-tight">{lang === 'sk' ? skLabel : enLabel}</span>
              <span className={`text-[10px] leading-tight ${active ? 'text-primary/70' : 'text-muted-foreground'}`}>
                {lang === 'sk' ? skDesc : enDesc}
              </span>
            </button>
          )
        })}
      </div>

      {/* Flight number lookup */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
        <p className="text-sm font-medium">
          {lang === 'sk' ? 'Číslo letu (voliteľné)' : 'Flight number (optional)'}
        </p>
        <p className="text-xs text-muted-foreground -mt-2">
          {lang === 'sk'
            ? 'Zadaj číslo letu alebo vyber leteckú spoločnosť — automaticky sa zobrazia požiadavky na batožinu.'
            : 'Enter your flight number or pick an airline to see baggage requirements automatically.'}
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputFlight}
            onChange={(e) => handleFlightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleFlightLookup()
            }}
            placeholder={lang === 'sk' ? 'napr. FR1234, W6 5678' : 'e.g. FR1234, W6 5678'}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 uppercase placeholder:normal-case placeholder:text-muted-foreground"
            aria-label={lang === 'sk' ? 'Číslo letu' : 'Flight number'}
          />
          <button
            type="button"
            onClick={handleFlightLookup}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            {lang === 'sk' ? 'Hľadať' : 'Search'}
          </button>
        </div>

        {/* Airline quick-pick */}
        <button
          type="button"
          onClick={() => setShowAirlines((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronDown className={`size-3.5 transition-transform ${showAirlines ? 'rotate-180' : ''}`} aria-hidden="true" />
          {lang === 'sk' ? 'Alebo vyber leteckú spoločnosť' : 'Or pick an airline'}
        </button>

        {showAirlines && (
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_AIRLINES.map((a) => (
              <button
                key={a.iata}
                type="button"
                onClick={() => pickAirline(a.iata)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  flightInfo?.iata === a.iata
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* Result */}
        {flightInfo && (
          <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                {flightInfo.airline}
              </span>
            </div>
            <div className="ml-6 flex flex-col gap-0.5 text-xs text-green-700 dark:text-green-400">
              <span>
                {lang === 'sk' ? 'Kabínová batožina:' : 'Cabin bag:'}{' '}
                <strong>{flightInfo.cabinBagSize}</strong>
                {flightInfo.cabinBagWeight ? ` · max. ${flightInfo.cabinBagWeight} kg` : ''}
              </span>
              {flightInfo.checkedBagWeight != null && (
                <span>
                  {lang === 'sk' ? 'Odbavená batožina:' : 'Checked bag:'}{' '}
                  <strong>max. {flightInfo.checkedBagWeight} kg</strong>
                </span>
              )}
              {flightInfo.priorityBoardingNote && (
                <span className="mt-0.5 italic">{flightInfo.priorityBoardingNote}</span>
              )}
            </div>
          </div>
        )}

        {notFound && !flightInfo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-amber-700 dark:text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {lang === 'sk'
                ? 'Leteckú spoločnosť sa nepodarilo rozpoznať. Skontroluj pravidlá batožiny priamo na webe spoločnosti.'
                : 'Airline not recognised. Please check baggage rules directly on the airline website.'}
            </p>
          </div>
        )}
      </div>

      {/* Priority & paid bag toggles */}
      <div className="flex flex-col gap-2">
        <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
          hasPriority ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
        }`}>
          <input
            type="checkbox"
            checked={hasPriority}
            onChange={(e) => handlePriority(e.target.checked)}
            className="size-4 shrink-0 accent-[#0e7c86]"
          />
          <span>
            <span className="block text-sm font-medium">
              {lang === 'sk' ? 'Mám zaplatené Priority boarding' : 'I have Priority boarding'}
            </span>
            <span className="block text-xs text-muted-foreground">
              {lang === 'sk'
                ? 'Väčší kabínkový kufrík povolený do kabíny + prednostný nástup'
                : 'Larger cabin bag allowed onboard + priority boarding'}
            </span>
          </span>
        </label>

        {(luggageType === 'kufor-velky' || luggageType === 'ruksak+kabinka') && (
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
            hasPaidBag ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
          }`}>
            <input
              type="checkbox"
              checked={hasPaidBag}
              onChange={(e) => handlePaidBag(e.target.checked)}
              className="size-4 shrink-0 accent-[#0e7c86]"
            />
            <span>
              <span className="block text-sm font-medium">
                {lang === 'sk'
                  ? needsCheckedBag
                    ? 'Mám zaplatenú väčšiu odbavovanú batožinu'
                    : 'Mám zaplatený väčší kufrík (príplatok)'
                  : needsCheckedBag
                    ? 'I have a paid extra checked bag'
                    : 'I paid for a larger bag (add-on)'}
              </span>
              <span className="block text-xs text-muted-foreground">
                {lang === 'sk'
                  ? 'Zaznamená limit kg do packlistu'
                  : 'Records the kg limit in the packing list'}
              </span>
            </span>
          </label>
        )}
      </div>
    </fieldset>
  )
}
