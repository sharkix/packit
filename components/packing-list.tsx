'use client'

import { useState } from 'react'
import { Plus, Trash2, PartyPopper } from 'lucide-react'
import type { PackItem } from '@/lib/types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/packing'

export function PackingList({
  items,
  onToggle,
  onDelete,
  onAdd,
}: {
  items: PackItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
}) {
  const done = items.filter((i) => i.checked).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const categories = CATEGORY_ORDER.filter((c) =>
    items.some((i) => i.category === c),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {pct === 100 ? (
              <span className="flex items-center gap-1.5 text-primary">
                <PartyPopper className="size-4" aria-hidden="true" />
                Všetko zbalené!
              </span>
            ) : (
              `Zbalené ${done} z ${items.length}`
            )}
          </span>
          <span className="font-semibold text-primary">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Priebeh balenia"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          items={items.filter((i) => i.category === cat)}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      ))}
    </div>
  )
}

function CategorySection({
  category,
  items,
  onToggle,
  onDelete,
  onAdd,
}: {
  category: string
  items: PackItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
}) {
  const [newItem, setNewItem] = useState('')
  const done = items.filter((i) => i.checked).length

  function submit() {
    const v = newItem.trim()
    if (!v) return
    onAdd(category, v)
    setNewItem('')
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold">{CATEGORY_LABELS[category]}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            done === items.length
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {done}/{items.length}
        </span>
      </header>

      <ul>
        {items.map((it) => (
          <li
            key={it.id}
            className="group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
          >
            <input
              type="checkbox"
              id={`item-${it.id}`}
              checked={it.checked}
              onChange={() => onToggle(it.id)}
              className="size-5 shrink-0 accent-[#0e7c86]"
            />
            <label
              htmlFor={`item-${it.id}`}
              className={`min-w-0 flex-1 cursor-pointer text-sm leading-relaxed ${
                it.checked ? 'text-muted-foreground line-through' : ''
              }`}
            >
              {it.name}
              {it.qty != null && (
                <span className="ml-1.5 font-semibold text-primary">
                  {it.qty}×
                </span>
              )}
              {it.note && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({it.note})
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={() => onDelete(it.id)}
              aria-label={`Odstrániť ${it.name}`}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 px-4 py-2.5">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              submit()
            }
          }}
          placeholder="Pridať vlastnú položku…"
          aria-label={`Pridať položku do kategórie ${CATEGORY_LABELS[category]}`}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Pridať položku"
          className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
