'use client'

import { useState } from 'react'
import {
  AlertCircle,
  Backpack,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Luggage,
  Plus,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { BAG_PRESETS, bagFromPreset } from '@/lib/packing'
import { POPULAR_AIRLINES, lookupFlightBaggage } from '@/lib/flight'
import { useLang } from '@/lib/i18n'
import type { AiBagResult } from '@/app/api/ai-bag/route'
import type { BagSpec, FlightInfo, LuggagePiece } from '@/lib/types'
import { Card, Chip, Eyebrow, Toggle, cx, inputClass } from './ui'

const KIND_ICON: Record<LuggagePiece, typeof Backpack> = {
  osobna: Backpack,
  kabinova: Briefcase,
  odbavena: Luggage,
}

export function BagSetup({
  bags,
  flightNumber,
  flightInfo,
  hasPriority,
  hasPaidBag,
  hasFlight,
  onChange,
}: {
  bags: BagSpec[]
  flightNumber: string
  flightInfo: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  hasFlight: boolean
  onChange: (v: {
    bags?: BagSpec[]
    flightNumber?: string
    flightInfo?: FlightInfo | null
    hasPriority?: boolean
    hasPaidBag?: boolean
  }) => void
}) {
  const { t, lang } = useLang()

  function updateBag(id: string, patch: Partial<BagSpec>) {
    onChange({ bags: bags.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
  }

  function addBag(kind: LuggagePiece) {
    onChange({ bags: [...bags, bagFromPreset(kind, `bag${Date.now()}`)] })
  }

  function removeBag(id: string) {
    if (bags.length <= 1) return
    onChange({ bags: bags.filter((b) => b.id !== id) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Eyebrow>{t.bags}</Eyebrow>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{t.bagsHint}</p>
      </div>

      {hasFlight && (
        <FlightLookup
          flightNumber={flightNumber}
          flightInfo={flightInfo}
          hasPriority={hasPriority}
          hasPaidBag={hasPaidBag}
          hasCheckedBag={bags.some((b) => b.kind === 'odbavena')}
          onChange={onChange}
        />
      )}

      <ul className="flex flex-col gap-3">
        {bags.map((bag) => (
          <li key={bag.id}>
            <BagCard
              bag={bag}
              flightInfo={flightInfo}
              canRemove={bags.length > 1}
              onChange={(patch) => updateBag(bag.id, patch)}
              onRemove={() => removeBag(bag.id)}
              t={t}
              lang={lang}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {(['osobna', 'kabinova', 'odbavena'] as LuggagePiece[]).map((kind) => {
          const Icon = KIND_ICON[kind]
          const label =
            kind === 'osobna' ? t.bagKindOsobna : kind === 'kabinova' ? t.bagKindKabinova : t.bagKindOdbavena
          return (
            <button
              key={kind}
              type="button"
              onClick={() => addBag(kind)}
              className="flex items-center gap-2 rounded-full border border-dashed border-input bg-card px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BagCard({
  bag,
  flightInfo,
  canRemove,
  onChange,
  onRemove,
  t,
  lang,
}: {
  bag: BagSpec
  flightInfo: FlightInfo | null
  canRemove: boolean
  onChange: (patch: Partial<BagSpec>) => void
  onRemove: () => void
  t: ReturnType<typeof useLang>['t']
  lang: 'sk' | 'en'
}) {
  const [query, setQuery] = useState(bag.model ?? '')
  const [loading, setLoading] = useState(false)
  const [tips, setTips] = useState<string[] | null>(null)
  const [error, setError] = useState(false)
  const Icon = KIND_ICON[bag.kind]

  async function lookup() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(false)
    setTips(null)
    try {
      const res = await fetch('/api/ai-bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          airline: flightInfo?.airline,
          cabinLimit: flightInfo?.cabinBagSize,
          personalItemLimit: flightInfo?.personalItemSize,
          lang,
        }),
      })
      if (!res.ok) throw new Error('lookup failed')
      const data: AiBagResult = await res.json()
      onChange({
        model: data.model || q,
        litres: data.litres > 0 ? data.litres : bag.litres,
        dimensions: data.dimensions || bag.dimensions,
        emptyWeightKg: data.emptyWeightKg || bag.emptyWeightKg,
        kind: data.kind ?? bag.kind,
        aiResolved: true,
        confidence: data.confidence,
        note: data.note,
        fitsCabin: data.fitsCabin,
      })
      setTips(data.packingTips ?? null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const preset = BAG_PRESETS.filter((p) => p.kind === bag.kind)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {bag.model || (bag.kind === 'osobna' ? t.bagKindOsobna : bag.kind === 'kabinova' ? t.bagKindKabinova : t.bagKindOdbavena)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[bag.litres ? `${bag.litres} l` : null, bag.dimensions, bag.emptyWeightKg ? `${bag.emptyWeightKg} kg` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.removeBag}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3.5">
        {/* Exact model lookup — the feature that makes carry-on planning real */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`model-${bag.id}`} className="text-sm font-semibold">
            {t.bagModel}
          </label>
          <div className="flex gap-2">
            <input
              id={`model-${bag.id}`}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                onChange({ model: e.target.value })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  lookup()
                }
              }}
              placeholder={t.bagModelPlaceholder}
              className={cx(inputClass, 'flex-1')}
            />
            <button
              type="button"
              onClick={lookup}
              disabled={loading || !query.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="size-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{t.bagLookup}</span>
            </button>
          </div>
        </div>

        {/* Manual override — always available, AI is a shortcut not a gate */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`l-${bag.id}`} className="text-xs font-medium text-muted-foreground">
              {t.bagLitres}
            </label>
            <input
              id={`l-${bag.id}`}
              type="number"
              min={1}
              max={200}
              value={bag.litres}
              onChange={(e) => onChange({ litres: Math.max(1, Number(e.target.value) || 1) })}
              className={cx(inputClass, 'py-2 tabular-nums')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`w-${bag.id}`} className="text-xs font-medium text-muted-foreground">
              {t.bagWeightLimit}
            </label>
            <input
              id={`w-${bag.id}`}
              type="number"
              min={0}
              max={50}
              value={bag.maxWeightKg ?? ''}
              onChange={(e) =>
                onChange({ maxWeightKg: e.target.value === '' ? undefined : Number(e.target.value) })
              }
              className={cx(inputClass, 'py-2 tabular-nums')}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="text-xs font-medium text-muted-foreground">
              <Ruler className="mr-1 inline size-3" aria-hidden="true" />
              {bag.dimensions ?? '—'}
            </span>
            <div className="flex flex-wrap gap-1">
              {preset.map((p) => (
                <Chip
                  key={p.sk}
                  size="sm"
                  active={bag.litres === p.litres && !bag.aiResolved}
                  onClick={() =>
                    onChange({
                      litres: p.litres,
                      dimensions: p.dimensions,
                      emptyWeightKg: p.emptyWeightKg,
                      maxWeightKg: p.maxWeightKg,
                      aiResolved: false,
                      model: undefined,
                      note: undefined,
                    })
                  }
                >
                  {lang === 'en' ? p.en : p.sk}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {bag.aiResolved && bag.note && (
          <div
            className={cx(
              'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs',
              bag.fitsCabin === false
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-success/40 bg-success/10 text-success',
            )}
          >
            {bag.fitsCabin === false ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="min-w-0">
              {bag.note}
              {bag.confidence && bag.confidence !== 'high' && (
                <span className="ml-1 opacity-70">
                  ({bag.confidence === 'low' ? (lang === 'en' ? 'low confidence' : 'nízka istota') : lang === 'en' ? 'medium confidence' : 'stredná istota'})
                </span>
              )}
            </span>
          </div>
        )}

        {tips && tips.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl bg-muted px-3.5 py-2.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {t.aiError}
          </p>
        )}
      </div>
    </Card>
  )
}

function FlightLookup({
  flightNumber,
  flightInfo,
  hasPriority,
  hasPaidBag,
  hasCheckedBag,
  onChange,
}: {
  flightNumber: string
  flightInfo: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  hasCheckedBag: boolean
  onChange: (v: {
    flightNumber?: string
    flightInfo?: FlightInfo | null
    hasPriority?: boolean
    hasPaidBag?: boolean
  }) => void
}) {
  const { t, lang } = useLang()
  const [input, setInput] = useState(flightNumber)
  const [loading, setLoading] = useState(false)
  const [showAirlines, setShowAirlines] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function resolveViaAi(num: string, prio: boolean, paid: boolean): Promise<FlightInfo | null> {
    try {
      const res = await fetch('/api/ai-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightNumber: num, hasPriority: prio, hasPaidBag: paid, lang }),
      })
      if (!res.ok) return null
      const data = await res.json()
      const b = data.baggageInfo
      if (!b?.airline) return null
      return {
        flightNumber: num.toUpperCase(),
        airline: b.airline,
        iata: num.replace(/\d+.*/, '').trim().toUpperCase(),
        cabinBagSize: b.cabinSize ?? '55×40×20 cm',
        cabinBagWeight: b.cabinWeightKg,
        checkedBagWeight: b.checkedWeightKg,
        priorityBoardingNote: prio ? b.priorityNote : undefined,
        source: 'api',
      }
    } catch {
      return null
    }
  }

  async function search(raw = input, prio = hasPriority, paid = hasPaidBag) {
    const q = raw.trim()
    if (!q) {
      onChange({ flightNumber: '', flightInfo: null })
      setNotFound(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    const local = lookupFlightBaggage(q, prio, paid)
    if (local) {
      setLoading(false)
      onChange({ flightNumber: q, flightInfo: local })
      return
    }
    const ai = await resolveViaAi(q, prio, paid)
    setLoading(false)
    onChange({ flightNumber: q, flightInfo: ai })
    setNotFound(!ai)
  }

  function setPriority(v: boolean) {
    const local = flightNumber ? lookupFlightBaggage(flightNumber, v, hasPaidBag) : null
    onChange({ hasPriority: v, flightInfo: local ?? flightInfo })
  }

  function setPaidBag(v: boolean) {
    const local = flightNumber ? lookupFlightBaggage(flightNumber, hasPriority, v) : null
    onChange({ hasPaidBag: v, flightInfo: local ?? flightInfo })
  }

  return (
    <Card className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="flight-no" className="text-sm font-semibold">
          {t.flightNumber}
        </label>
        <div className="flex gap-2">
          <input
            id="flight-no"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (!e.target.value.trim()) {
                onChange({ flightNumber: '', flightInfo: null })
                setNotFound(false)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                search()
              }
            }}
            placeholder={t.flightNumberPlaceholder}
            className={cx(inputClass, 'flex-1 uppercase placeholder:normal-case')}
          />
          <button
            type="button"
            onClick={() => search()}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{t.flightSearch}</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAirlines((v) => !v)}
        className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={cx('size-3.5 transition-transform', showAirlines && 'rotate-180')} aria-hidden="true" />
        {t.orPickAirline}
      </button>

      {showAirlines && (
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_AIRLINES.map((a) => (
            <Chip
              key={a.iata}
              size="sm"
              active={flightInfo?.iata === a.iata}
              onClick={() => {
                const fake = `${a.iata}001`
                setInput(fake)
                setShowAirlines(false)
                search(fake)
              }}
            >
              {a.name}
            </Chip>
          ))}
        </div>
      )}

      {flightInfo && (
        <div className="flex flex-col gap-1 rounded-xl border border-success/40 bg-success/10 px-3.5 py-2.5 text-xs text-success">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            {flightInfo.airline}
          </span>
          <span className="ml-6">
            {lang === 'en' ? 'Cabin bag' : 'Kabínová'}: <strong>{flightInfo.cabinBagSize}</strong>
            {flightInfo.cabinBagWeight ? ` · ${flightInfo.cabinBagWeight} kg` : ''}
          </span>
          {flightInfo.personalItemSize && (
            <span className="ml-6">
              {lang === 'en' ? 'Personal item' : 'Osobná'}: <strong>{flightInfo.personalItemSize}</strong>
            </span>
          )}
          {flightInfo.checkedBagWeight != null && (
            <span className="ml-6">
              {lang === 'en' ? 'Checked' : 'Odbavená'}: <strong>max. {flightInfo.checkedBagWeight} kg</strong>
            </span>
          )}
          {flightInfo.priorityBoardingNote && (
            <span className="ml-6 italic">{flightInfo.priorityBoardingNote}</span>
          )}
        </div>
      )}

      {notFound && !flightInfo && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-xs text-warning">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.airlineNotFound}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Toggle checked={hasPriority} onChange={setPriority} label={t.hasPriority} hint={t.hasPriorityHint} />
        {hasCheckedBag && (
          <Toggle checked={hasPaidBag} onChange={setPaidBag} label={t.hasPaidBag} hint={t.hasPaidBagHint} />
        )}
      </div>
    </Card>
  )
}
