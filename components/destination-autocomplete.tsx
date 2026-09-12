'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Loader2, MapPin, X } from 'lucide-react'
import { searchDestinations } from '@/lib/weather'
import type { GeoResult } from '@/lib/types'
import { useLang } from '@/lib/i18n'
import { cx } from './ui'

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function DestinationAutocomplete({
  id,
  selected,
  onSelect,
}: {
  id: string
  selected: GeoResult | null
  onSelect: (dest: GeoResult | null) => void
}) {
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debouncedQuery = useDebouncedValue(query, 300)
  const listboxId = `${id}-listbox`
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
  }, [])

  const { data: results, isLoading } = useSWR(
    debouncedQuery.trim().length >= 2 && open ? ['geocode', debouncedQuery.trim(), lang] : null,
    ([, q, l]) => searchDestinations(q, l),
    { keepPreviousData: true, revalidateOnFocus: false },
  )

  const displayValue = selected
    ? `${selected.name}${selected.country ? ', ' + selected.country : ''}`
    : query

  function pick(r: GeoResult) {
    onSelect(r)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
  }

  function clear() {
    onSelect(null)
    setQuery('')
    setOpen(false)
  }

  const showList = open && !selected && (results?.length ?? 0) > 0

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {t.destination}
      </label>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t.destinationPlaceholder}
          value={displayValue}
          onChange={(e) => {
            if (selected) onSelect(null)
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            if (!selected && query.trim().length >= 2) setOpen(true)
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={(e) => {
            if (!showList || !results?.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              if (e.nativeEvent.isComposing) return
              if (activeIndex >= 0) {
                e.preventDefault()
                pick(results[activeIndex])
              }
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className="w-full rounded-xl border border-input bg-card py-3 pl-10.5 pr-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
        {isLoading && (
          <Loader2
            className="absolute right-3 top-1/2 size-4.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {!isLoading && selected && (
          <button
            type="button"
            onClick={clear}
            aria-label={t.removeItem}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {showList && results && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lift)]"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(r)
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cx(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  i === activeIndex && 'bg-muted',
                )}
              >
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                    {r.elevation != null ? ` · ${Math.round(r.elevation)} m` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
