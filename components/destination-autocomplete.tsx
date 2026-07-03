'use client'

import { useRef, useState } from 'react'
import useSWR from 'swr'
import { MapPin, Loader2 } from 'lucide-react'
import { searchDestinations } from '@/lib/weather'
import type { GeoResult } from '@/lib/types'

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const last = useRef(value)
  if (last.current !== value) {
    last.current = value
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebounced(value), delay)
  }
  return debounced
}

export function DestinationAutocomplete({
  selected,
  onSelect,
}: {
  selected: GeoResult | null
  onSelect: (dest: GeoResult | null) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debouncedQuery = useDebouncedValue(query, 300)

  const { data: results, isLoading } = useSWR(
    debouncedQuery.trim().length >= 2 && open
      ? ['geocode', debouncedQuery.trim()]
      : null,
    ([, q]) => searchDestinations(q),
    { keepPreviousData: true },
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

  return (
    <div className="relative">
      <label
        htmlFor="destination"
        className="mb-1.5 block text-sm font-semibold"
      >
        Destinácia
      </label>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="destination"
          type="text"
          role="combobox"
          aria-expanded={open && (results?.length ?? 0) > 0}
          aria-controls="destination-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Kam cestuješ? Napr. Chorvátsko, Vysoké Tatry…"
          value={displayValue}
          onChange={(e) => {
            onSelect(null)
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            if (!selected && query.trim().length >= 2) setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !results?.length) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (activeIndex >= 0) {
                e.preventDefault()
                pick(results[activeIndex])
              }
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          className="w-full rounded-lg border border-input bg-card py-3 pl-10 pr-10 text-base outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {isLoading && (
          <Loader2
            className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {open && results && results.length > 0 && !selected && (
        <ul
          id="destination-listbox"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg"
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
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === activeIndex ? 'bg-muted' : ''
                }`}
              >
                <MapPin
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
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
