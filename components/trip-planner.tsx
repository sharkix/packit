'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  CalendarDays,
  Luggage,
  MapPin,
  RotateCcw,
  Route,
  Sparkles,
  User,
} from 'lucide-react'
import type { AiAssistantResult } from '@/app/api/ai-assistant/route'
import type { AiLookupResult } from '@/app/api/ai-lookup/route'
import type { AiPacklistResult } from '@/app/api/ai-packlist/route'
import { ACTIVITY_LABELS_SK } from '@/lib/activities'
import { useLang } from '@/lib/i18n'
import {
  aggregateClimate,
  bagFromPreset,
  computeCapacity,
  generatePackingList,
  tripDays,
  tripRange,
} from '@/lib/packing'
import { fetchWeather } from '@/lib/weather'
import type {
  BagAssignment,
  BagSpec,
  CountryInfo,
  FlightInfo,
  Gender,
  Pace,
  PackItem,
  TripConfig,
  TripLeg,
} from '@/lib/types'
import { AiAssistant, AiAssistantButton } from './ai-assistant'
import { AiStatus, type AiStatusValue } from './ai-status'
import { BagSetup } from './bag-setup'
import { CapacityMeter } from './capacity-meter'
import { CountryInfoCards } from './country-info-card'
import { DayPlan } from './day-plan'
import { LegEditor } from './leg-editor'
import { PackingList } from './packing-list'
import { Chip, Eyebrow, LangToggle, ThemeToggle, Toggle, cx, inputClass } from './ui'
import { ClimateCard } from './weather-card'

const STORAGE_KEY = 'packit_v2'
const LEGACY_KEY = 'zbalene_v1'

type Step = 'route' | 'you' | 'bags' | 'list'
const STEPS: Step[] = ['route', 'you', 'bags', 'list']

interface PersistedState {
  legs: TripLeg[]
  gender: Gender
  pace: Pace
  laundry: boolean
  bags: BagSpec[]
  flightNumber: string
  flightInfo: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  countryInfos: Record<string, CountryInfo>
  personalNotes: string
  items: PackItem[] | null
  step: Step
}

function newLeg(): TripLeg {
  const today = new Date()
  const start = today.toISOString().slice(0, 10)
  const end = new Date(today.getTime() + 4 * 86400000).toISOString().slice(0, 10)
  return {
    id: `leg${Date.now()}`,
    destination: null,
    startDate: start,
    endDate: end,
    transport: 'lietadlo',
    accommodation: 'hotel',
    activities: [],
  }
}

/** v1 stored a single destination; lift it into the first leg so saves survive. */
function migrateLegacy(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const old = JSON.parse(raw)
    if (!old?.destination || !old?.startDate || !old?.endDate) return null
    return {
      legs: [
        {
          id: 'leg-migrated',
          destination: old.destination,
          startDate: old.startDate,
          endDate: old.endDate,
          transport: old.transport ?? 'lietadlo',
          accommodation: old.accommodation ?? 'hotel',
          activities: (old.tripTypes ?? []).map((x: string) =>
            x === 'more' ? 'beach' : x === 'hory' ? 'hiking' : 'city',
          ),
        },
      ],
      gender: old.gender ?? 'neuvedene',
      flightNumber: old.flightNumber ?? '',
      flightInfo: old.flightInfo ?? null,
      hasPriority: !!old.hasPriority,
      hasPaidBag: !!old.hasPaidBag,
    }
  } catch {
    return null
  }
}

export function TripPlanner() {
  const { t, locale, lang } = useLang()

  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<Step>('route')
  const [legs, setLegs] = useState<TripLeg[]>([newLeg()])
  const [gender, setGender] = useState<Gender>('neuvedene')
  const [pace, setPace] = useState<Pace>('stredne')
  const [laundry, setLaundry] = useState(false)
  const [personalNotes, setPersonalNotes] = useState('')
  const [bags, setBags] = useState<BagSpec[]>([bagFromPreset('kabinova', 'bag1')])
  const [flightNumber, setFlightNumber] = useState('')
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null)
  const [hasPriority, setHasPriority] = useState(false)
  const [hasPaidBag, setHasPaidBag] = useState(false)
  const [countryInfos, setCountryInfos] = useState<Record<string, CountryInfo>>({})
  const [countryLoading, setCountryLoading] = useState(false)
  const [items, setItems] = useState<PackItem[] | null>(null)
  const [aiStatus, setAiStatus] = useState<AiStatusValue>('idle')
  const [aiResult, setAiResult] = useState<AiPacklistResult | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState<Record<string, boolean>>({})

  // ── Hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const saved: Partial<PersistedState> | null = raw ? JSON.parse(raw) : migrateLegacy()
      if (saved) {
        if (saved.legs?.length) setLegs(saved.legs)
        if (saved.gender) setGender(saved.gender)
        if (saved.pace) setPace(saved.pace)
        if (saved.laundry != null) setLaundry(saved.laundry)
        if (saved.personalNotes) setPersonalNotes(saved.personalNotes)
        if (saved.bags?.length) setBags(saved.bags)
        if (saved.flightNumber) setFlightNumber(saved.flightNumber)
        if (saved.flightInfo) setFlightInfo(saved.flightInfo)
        if (saved.hasPriority != null) setHasPriority(saved.hasPriority)
        if (saved.hasPaidBag != null) setHasPaidBag(saved.hasPaidBag)
        if (saved.countryInfos) setCountryInfos(saved.countryInfos)
        if (saved.items) setItems(saved.items)
        if (saved.step) setStep(saved.step)
      }
    } catch {
      /* corrupted save — start fresh rather than crashing the app */
    }
    setHydrated(true)
  }, [])

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return
    const state: PersistedState = {
      legs,
      gender,
      pace,
      laundry,
      bags,
      flightNumber,
      flightInfo,
      hasPriority,
      hasPaidBag,
      countryInfos,
      personalNotes,
      items,
      step,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota exceeded — the app keeps working, it just will not resume */
    }
  }, [
    hydrated, legs, gender, pace, laundry, bags, flightNumber, flightInfo,
    hasPriority, hasPaidBag, countryInfos, personalNotes, items, step,
  ])

  // ── Weather per leg ────────────────────────────────────────────────────────
  const inflight = useRef(new Set<string>())

  useEffect(() => {
    if (!hydrated) return
    for (const leg of legs) {
      const { destination, startDate, endDate } = leg
      if (!destination || !startDate || !endDate || leg.weather) continue
      const key = `${leg.id}|${destination.latitude},${destination.longitude}|${startDate}|${endDate}`
      if (inflight.current.has(key)) continue
      inflight.current.add(key)
      setWeatherLoading((p) => ({ ...p, [leg.id]: true }))
      fetchWeather(destination.latitude, destination.longitude, startDate, endDate)
        .then((w) => {
          setLegs((prev) => prev.map((l) => (l.id === leg.id ? { ...l, weather: w } : l)))
        })
        .catch(() => {
          /* no forecast for this leg — the list still generates without it */
        })
        .finally(() => {
          inflight.current.delete(key)
          setWeatherLoading((p) => ({ ...p, [leg.id]: false }))
        })
    }
  }, [legs, hydrated])

  // ── Destination intel per country ──────────────────────────────────────────
  const countryKeys = useMemo(() => {
    const map = new Map<string, TripLeg>()
    for (const l of legs) {
      const code = l.destination?.country_code?.toUpperCase()
      if (code && !map.has(code)) map.set(code, l)
    }
    return map
  }, [legs])

  useEffect(() => {
    if (!hydrated) return
    const missing = [...countryKeys.entries()].filter(([code]) => !countryInfos[code])
    if (!missing.length) return
    let cancelled = false
    setCountryLoading(true)
    Promise.all(
      missing.map(async ([code, leg]) => {
        try {
          const res = await fetch('/api/ai-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              countryCode: code,
              country: leg.destination?.country,
              destination: leg.destination?.name,
              activities: leg.activities.map((a) => ACTIVITY_LABELS_SK[a]),
              flightIata: flightInfo?.iata,
              flightNumber: flightNumber || undefined,
              hasPriority,
              hasPaidBag,
              lang,
            }),
          })
          if (!res.ok) return null
          const data: AiLookupResult = await res.json()
          return [code, data as CountryInfo] as const
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, CountryInfo> = {}
      for (const r of results) if (r) next[r[0]] = r[1]
      if (Object.keys(next).length) setCountryInfos((prev) => ({ ...prev, ...next }))
      setCountryLoading(false)
    })
    return () => {
      cancelled = true
    }
    // flight details intentionally excluded: they refine baggage info, but
    // re-running the country lookup on every keystroke would be wasteful
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryKeys, hydrated, lang])

  // ── Derived ────────────────────────────────────────────────────────────────
  const cfg: TripConfig = useMemo(
    () => ({
      legs,
      gender,
      pace,
      laundry,
      bags,
      flightNumber: flightNumber || undefined,
      flightInfo,
      hasPriority,
      hasPaidBag,
      countryInfos,
      personalNotes: personalNotes || undefined,
    }),
    [legs, gender, pace, laundry, bags, flightNumber, flightInfo, hasPriority, hasPaidBag, countryInfos, personalNotes],
  )

  const climate = useMemo(() => aggregateClimate(legs), [legs])
  const readyLegs = legs.filter((l) => l.destination && l.startDate && l.endDate)
  const canGenerate = readyLegs.length > 0
  const days = tripDays(legs)
  const range = tripRange(legs)
  const hasFlight = legs.some((l) => l.transport === 'lietadlo')

  const capacity = useMemo(() => computeCapacity(items ?? [], bags), [items, bags])
  const wornCount = (items ?? []).filter((i) => i.bag === 'naSebe').length
  const availableBags = useMemo<BagAssignment[]>(
    () => [...new Set(bags.map((b) => b.kind))] as BagAssignment[],
    [bags],
  )

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = useCallback(() => {
    if (!canGenerate) return
    const base = generatePackingList(cfg)
    setItems(base)
    setStep('list')
    setAiResult(null)
    setAiStatus('loading')

    fetch('/api/ai-packlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cfg, items: base }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('ai failed')
        return r.json() as Promise<AiPacklistResult>
      })
      .then((result) => {
        setAiResult(result)
        setAiStatus('done')
        setItems((prev) => {
          if (!prev) return prev
          const removed = new Set(result.removals.map((s) => s.toLowerCase()))
          const highlighted = new Set(result.highlights.map((s) => s.toLowerCase()))
          const kept = prev
            .filter((i) => !removed.has(i.name.toLowerCase()))
            .map((i) => (highlighted.has(i.name.toLowerCase()) ? { ...i, highlight: true } : i))
          const existing = new Set(kept.map((i) => i.name.toLowerCase()))
          const additions: PackItem[] = result.additions
            .filter((a) => !existing.has(a.name.toLowerCase()))
            .map((a, idx) => ({
              id: `ai${Date.now()}${idx}`,
              category: a.category,
              name: a.name,
              qty: a.qty,
              note: a.note,
              checked: false,
              aiAdded: true,
              litres: a.litres,
              grams: a.grams,
              bag: a.bag,
              legIds: a.legIds,
              highlight: highlighted.has(a.name.toLowerCase()),
            }))
          return [...kept, ...additions]
        })
      })
      .catch(() => setAiStatus('error'))
  }, [canGenerate, cfg])

  // ── Assistant patches ──────────────────────────────────────────────────────
  const applyAssistant = useCallback((result: AiAssistantResult) => {
    setItems((prev) => {
      if (!prev) return prev
      const removed = new Set((result.remove ?? []).map((s) => s.toLowerCase()))
      let next = prev.filter((i) => !removed.has(i.name.toLowerCase()))

      for (const u of result.update ?? []) {
        const key = u.name.toLowerCase()
        next = next.map((i) =>
          i.name.toLowerCase() === key
            ? {
                ...i,
                qty: u.qty ?? i.qty,
                note: u.note ?? i.note,
                bag: u.bag ?? i.bag,
              }
            : i,
        )
      }

      const existing = new Set(next.map((i) => i.name.toLowerCase()))
      const additions: PackItem[] = (result.add ?? [])
        .filter((a) => !existing.has(a.name.toLowerCase()))
        .map((a, idx) => ({
          id: `chat${Date.now()}${idx}`,
          category: a.category,
          name: a.name,
          qty: a.qty,
          note: a.note,
          checked: false,
          aiAdded: true,
          litres: a.litres,
          grams: a.grams,
          bag: a.bag,
        }))
      return [...next, ...additions]
    })
  }, [])

  function reset() {
    if (!window.confirm(t.resetConfirm)) return
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* nothing to clear */
    }
    setLegs([newLeg()])
    setGender('neuvedene')
    setPace('stredne')
    setLaundry(false)
    setPersonalNotes('')
    setBags([bagFromPreset('kabinova', 'bag1')])
    setFlightNumber('')
    setFlightInfo(null)
    setHasPriority(false)
    setHasPaidBag(false)
    setCountryInfos({})
    setItems(null)
    setAiResult(null)
    setAiStatus('idle')
    setStep('route')
  }

  // Moving between steps should start you at the top of the new step, not
  // wherever the previous (much longer) one left the scroll position.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const stepIndex = STEPS.indexOf(step)

  function dayWord(n: number) {
    if (lang === 'en') return n === 1 ? t.day : t.days2
    return n === 1 ? t.day : n <= 4 ? t.days2 : t.days5
  }

  function stopWord(n: number) {
    if (lang === 'en') return n === 1 ? t.stops1 : t.stops2
    return n === 1 ? t.stops1 : n <= 4 ? t.stops2 : t.stops
  }

  return (
    <div className="min-h-dvh">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Luggage className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-bold leading-tight">
                {t.appName}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <LangToggle />
            <ThemeToggle />
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5 sm:pt-7">
        {/* ── Hero (only before a list exists) ───────────────────────────── */}
        {!items && step === 'route' && (
          <section className="paper-grade mb-6 rounded-3xl border border-border px-5 py-7 sm:px-8 sm:py-10">
            <Eyebrow>{t.heroEyebrow}</Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-bold leading-[1.05] text-balance sm:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
              {t.heroCopy}
            </p>
          </section>
        )}

        {/* ── Trip summary bar ───────────────────────────────────────────── */}
        {readyLegs.length > 0 && (
          <div className="no-print mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-border bg-card px-4 py-3 text-xs">
            <span className="flex items-center gap-1.5 font-semibold">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              {readyLegs.map((l) => l.destination?.name).join(' → ')}
            </span>
            {range.start && range.end && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {new Date(range.start + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })} –{' '}
                {new Date(range.end + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
              </span>
            )}
            <span className="text-muted-foreground tabular-nums">
              {days} {dayWord(days)} · {readyLegs.length} {stopWord(readyLegs.length)}
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t.reset}
            </button>
          </div>
        )}

        {/* ── Stepper ────────────────────────────────────────────────────── */}
        <nav className="no-print rail mb-6 flex gap-1.5 overflow-x-auto pb-1" aria-label={t.stepRoute}>
          {STEPS.map((s, i) => {
            const Icon = s === 'route' ? Route : s === 'you' ? User : s === 'bags' ? Backpack : Sparkles
            const label =
              s === 'route' ? t.stepRoute : s === 'you' ? t.stepYou : s === 'bags' ? t.stepBags : t.stepList
            const disabled = s === 'list' && !items
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                aria-current={step === s}
                onClick={() => setStep(s)}
                className={cx(
                  'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                  step === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <span
                  className={cx(
                    'flex size-5 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                    step === s ? 'bg-primary-foreground/20' : 'bg-muted',
                  )}
                >
                  {i + 1}
                </span>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* ── Step content ───────────────────────────────────────────────── */}
        {step === 'route' && (
          <div className="flex flex-col gap-6">
            <LegEditor legs={legs} onChange={setLegs} weatherLoading={weatherLoading} />
            <ClimateCard climate={climate} />
            <CountryInfoCards infos={Object.values(countryInfos)} isLoading={countryLoading} />
          </div>
        )}

        {step === 'you' && (
          <div className="flex flex-col gap-6">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.packFor}</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['zena', t.genderWoman],
                    ['muz', t.genderMan],
                    ['neuvedene', t.genderUnspecified],
                  ] as [Gender, string][]
                ).map(([value, label]) => (
                  <Chip key={value} active={gender === value} onClick={() => setGender(value)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.pace}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ['pokojne', t.pacePokojne, t.pacePokojneHint],
                    ['stredne', t.paceStredne, t.paceStredneHint],
                    ['nabite', t.paceNabite, t.paceNabiteHint],
                  ] as [Pace, string, string][]
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={pace === value}
                    onClick={() => setPace(value)}
                    className={cx(
                      'rounded-xl border px-4 py-3 text-left transition-colors',
                      pace === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Toggle checked={laundry} onChange={setLaundry} label={t.laundry} hint={t.laundryHint} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-semibold">
                {t.personalNotes}
              </label>
              <textarea
                id="notes"
                rows={3}
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder={t.personalNotesPlaceholder}
                className={cx(inputClass, 'resize-y')}
              />
            </div>
          </div>
        )}

        {step === 'bags' && (
          <BagSetup
            bags={bags}
            flightNumber={flightNumber}
            flightInfo={flightInfo}
            hasPriority={hasPriority}
            hasPaidBag={hasPaidBag}
            hasFlight={hasFlight}
            onChange={(v) => {
              if (v.bags) setBags(v.bags)
              if (v.flightNumber !== undefined) setFlightNumber(v.flightNumber)
              if (v.flightInfo !== undefined) setFlightInfo(v.flightInfo)
              if (v.hasPriority !== undefined) setHasPriority(v.hasPriority)
              if (v.hasPaidBag !== undefined) setHasPaidBag(v.hasPaidBag)
            }}
          />
        )}

        {step === 'list' && items && (
          <div className="flex flex-col gap-5">
            <AiStatus
              status={aiStatus}
              reasoning={aiResult?.reasoning}
              strategy={aiResult?.strategy}
              weatherNote={aiResult?.weatherNote}
            />

            <CapacityMeter
              report={capacity}
              wornCount={wornCount}
              onAskAi={() => setAssistantOpen(true)}
            />

            {aiResult?.capacityVerdict && (
              <p
                className={cx(
                  'no-print rounded-2xl border px-4 py-3 text-sm text-pretty',
                  aiResult.capacityVerdict.verdict === 'nezmesti'
                    ? 'border-destructive/40 bg-destructive/8 text-destructive'
                    : aiResult.capacityVerdict.verdict === 'tesne'
                      ? 'border-warning/40 bg-warning/10 text-warning'
                      : 'border-success/40 bg-success/8 text-success',
                )}
              >
                {aiResult.capacityVerdict.advice}
              </p>
            )}

            <ClimateCard climate={climate} />

            <PackingList
              items={items}
              availableBags={availableBags}
              onToggle={(id) =>
                setItems((p) => p?.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) ?? null)
              }
              onDelete={(id) => setItems((p) => p?.filter((i) => i.id !== id) ?? null)}
              onAdd={(category, name) =>
                setItems((p) =>
                  p
                    ? [
                        ...p,
                        {
                          id: `c${Date.now()}`,
                          category,
                          name,
                          checked: false,
                          custom: true,
                          litres: 0.3,
                          grams: 150,
                          bag: availableBags[0] ?? 'kabinova',
                        },
                      ]
                    : null,
                )
              }
              onQtyChange={(id, qty) =>
                setItems((p) => p?.map((i) => (i.id === id ? { ...i, qty } : i)) ?? null)
              }
              onBagChange={(id, bag) =>
                setItems((p) => p?.map((i) => (i.id === id ? { ...i, bag } : i)) ?? null)
              }
            />

            <DayPlan cfg={cfg} />

            <CountryInfoCards infos={Object.values(countryInfos)} isLoading={countryLoading} />
          </div>
        )}

        {/* ── Footer nav ─────────────────────────────────────────────────── */}
        <div className="no-print mt-8 flex flex-col gap-3">
          {step !== 'list' && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t.back}
              </button>
              {step !== 'bags' ? (
                <button
                  type="button"
                  onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)])}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {t.next}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
            </div>
          )}

          {step === 'bags' && (
            <>
              {items && (
                <p className="text-center text-xs text-muted-foreground text-pretty">{t.regenerateWarn}</p>
              )}
              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-[var(--shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Sparkles className="size-5" aria-hidden="true" />
                {items ? t.regenerate : t.generate}
              </button>
            </>
          )}

          {step === 'list' && (
            <button
              type="button"
              onClick={() => setStep('route')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {t.editTrip}
            </button>
          )}
        </div>

      </main>

      {items && step === 'list' && <AiAssistantButton onClick={() => setAssistantOpen(true)} />}

      <AiAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        cfg={cfg}
        items={items ?? []}
        onApply={applyAssistant}
      />
    </div>
  )
}
