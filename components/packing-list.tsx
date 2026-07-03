'use client'

import { useState } from 'react'
import {
  Plus,
  Trash2,
  PartyPopper,
  Printer,
  FileText,
  Luggage,
  Shirt,
  Footprints,
  Sparkles,
  HeartPulse,
  Smartphone,
  Waves,
  Mountain,
  Building2,
  Car,
  Compass,
  Map,
  CheckSquare,
  Minus,
  Star,
} from 'lucide-react'
import type { PackItem } from '@/lib/types'
import { CATEGORY_ORDER } from '@/lib/packing'
import { useLang } from '@/lib/i18n'

const CAT_ICON_MAP: Record<string, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  doklady: FileText,
  batazina: Luggage,
  oblecenie: Shirt,
  obuv: Footprints,
  hygiena: Sparkles,
  lekarnicka: HeartPulse,
  elektronika: Smartphone,
  plaz: Waves,
  hory: Mountain,
  mesto: Building2,
  auto: Car,
  geocaching: Compass,
  vylet: Map,
  predodchodom: CheckSquare,
}

const CAT_COLOR_MAP: Record<string, string> = {
  doklady: 'text-amber-600',
  batazina: 'text-slate-600',
  oblecenie: 'text-sky-600',
  obuv: 'text-orange-500',
  hygiena: 'text-pink-500',
  lekarnicka: 'text-red-500',
  elektronika: 'text-indigo-500',
  plaz: 'text-cyan-500',
  hory: 'text-emerald-600',
  mesto: 'text-violet-500',
  auto: 'text-blue-500',
  geocaching: 'text-lime-600',
  vylet: 'text-teal-500',
  predodchodom: 'text-primary',
}

export function PackingList({
  items,
  onToggle,
  onDelete,
  onAdd,
  onQtyChange,
}: {
  items: PackItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
}) {
  const { t } = useLang()
  const done = items.filter((i) => i.checked).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const categories = CATEGORY_ORDER.filter((c) =>
    items.some((i) => i.category === c),
  )

  function handlePrint() {
    window.print()
  }

  function catLabel(cat: string): string {
    const map: Record<string, string> = {
      doklady: t.catDoklady,
      batazina: t.catBatazina,
      oblecenie: t.catOblecenie,
      obuv: t.catObuv,
      hygiena: t.catHygiena,
      lekarnicka: t.catLekarnicka,
      elektronika: t.catElektronika,
      plaz: t.catPlaz,
      hory: t.catHory,
      mesto: t.catMesto,
      auto: t.catAuto,
      geocaching: t.catGeocaching,
      vylet: t.catVylet,
      predodchodom: t.catPredodchodom,
    }
    return map[cat] ?? cat
  }

  return (
    <div className="packing-print-root flex flex-col gap-4">
      {/* Progress bar – sticky, hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {pct === 100 ? (
              <span className="flex items-center gap-1.5 text-primary">
                <PartyPopper className="size-4" aria-hidden="true" />
                {t.allPacked}
              </span>
            ) : (
              `${t.packed} ${done} ${t.of} ${items.length}`
            )}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">{pct}%</span>
            <button
              type="button"
              onClick={handlePrint}
              title={t.printList}
              aria-label={t.printList}
              className="rounded-md border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Printer className="size-4" aria-hidden="true" />
            </button>
          </div>
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

      {/* Print header – only visible when printing */}
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold">{t.appName} — Packlist</h2>
      </div>

      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          label={catLabel(cat)}
          items={items.filter((i) => i.category === cat)}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={onAdd}
          onQtyChange={onQtyChange}
          t={t}
        />
      ))}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .packing-print-root, .packing-print-root * { visibility: visible; }
          .packing-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function CategorySection({
  category,
  label,
  items,
  onToggle,
  onDelete,
  onAdd,
  onQtyChange,
  t,
}: {
  category: string
  label: string
  items: PackItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
  t: ReturnType<typeof useLang>['t']
}) {
  const [newItem, setNewItem] = useState('')
  const done = items.filter((i) => i.checked).length
  const Icon = CAT_ICON_MAP[category] ?? FileText
  const iconColor = CAT_COLOR_MAP[category] ?? 'text-primary'

  function submit() {
    const v = newItem.trim()
    if (!v) return
    onAdd(category, v)
    setNewItem('')
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted ${iconColor}`}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h3 className="font-semibold">{label}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
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
          <PackingItem
            key={it.id}
            item={it}
            onToggle={onToggle}
            onDelete={onDelete}
            onQtyChange={onQtyChange}
            t={t}
          />
        ))}
      </ul>

      <div className="print:hidden flex items-center gap-2 px-4 py-2.5">
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
          placeholder={t.addItem}
          aria-label={`${t.addItemBtn} — ${label}`}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="button"
          onClick={submit}
          aria-label={t.addItemBtn}
          className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function PackingItem({
  item,
  onToggle,
  onDelete,
  onQtyChange,
  t,
}: {
  item: PackItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
  t: ReturnType<typeof useLang>['t']
}) {
  const [editingQty, setEditingQty] = useState(false)
  const [qtyInput, setQtyInput] = useState(String(item.qty ?? ''))

  function commitQty() {
    const n = parseInt(qtyInput, 10)
    if (!isNaN(n) && n > 0) {
      onQtyChange(item.id, n)
    } else if (qtyInput === '' || qtyInput === '0') {
      onQtyChange(item.id, undefined)
    }
    setEditingQty(false)
  }

  function decrement() {
    const cur = item.qty ?? 1
    if (cur <= 1) {
      onQtyChange(item.id, undefined)
    } else {
      onQtyChange(item.id, cur - 1)
      setQtyInput(String(cur - 1))
    }
  }

  function increment() {
    const cur = item.qty ?? 1
    onQtyChange(item.id, cur + 1)
    setQtyInput(String(cur + 1))
  }

  return (
    <li className={`group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 ${
      item.aiAdded ? 'bg-primary/[0.03]' : ''
    }`}>
      <input
        type="checkbox"
        id={`item-${item.id}`}
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className="size-5 shrink-0 accent-[#0e7c86]"
      />
      <label
        htmlFor={`item-${item.id}`}
        className={`min-w-0 flex-1 cursor-pointer text-sm leading-relaxed ${
          item.checked ? 'text-muted-foreground line-through' : ''
        }`}
      >
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {item.highlight && !item.checked && (
            <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" aria-label="Dôležitá položka" />
          )}
          {item.name}
          {item.aiAdded && !item.checked && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
              <Sparkles className="size-2.5" aria-hidden="true" />
              AI
            </span>
          )}
        </span>
        {item.note && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({item.note})
          </span>
        )}
      </label>

      {/* Qty controls */}
      {item.qty != null || editingQty ? (
        <div className="print:hidden flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={decrement}
            aria-label="Znížiť počet"
            className="flex size-6 items-center justify-center rounded border border-border bg-muted text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            <Minus className="size-3" aria-hidden="true" />
          </button>
          {editingQty ? (
            <input
              type="number"
              min={1}
              value={qtyInput}
              autoFocus
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { if (e.nativeEvent.isComposing || e.keyCode === 229) return; commitQty() }
                if (e.key === 'Escape') setEditingQty(false)
              }}
              className="w-10 rounded border border-ring bg-background px-1 py-0.5 text-center text-sm font-semibold outline-none"
              aria-label={t.qtyEdit}
            />
          ) : (
            <button
              type="button"
              onClick={() => { setQtyInput(String(item.qty ?? '')); setEditingQty(true) }}
              title={t.qtyEdit}
              aria-label={t.qtyEdit}
              className="min-w-[1.5rem] rounded px-1 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              {item.qty}×
            </button>
          )}
          <button
            type="button"
            onClick={increment}
            aria-label="Zvýšiť počet"
            className="flex size-6 items-center justify-center rounded border border-border bg-muted text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            <Plus className="size-3" aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* No qty yet – show qty-less display, allow adding qty on hover */
        <span className="print:hidden shrink-0 text-sm text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors select-none" />
      )}

      {/* Qty in print */}
      {item.qty != null && (
        <span className="hidden print:inline text-sm font-semibold text-foreground ml-1">
          {item.qty}×
        </span>
      )}

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`${t.removeItem} ${item.name}`}
        className="print:hidden shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}
