'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import {
  Backpack,
  Briefcase,
  FileText,
  Luggage,
  Minus,
  PartyPopper,
  Plus,
  Printer,
  Shirt,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import type { BagAssignment, PackItem } from '@/lib/types'
import { CATEGORY_ICONS, CATEGORY_ORDER } from '@/lib/packing'
import { useLang, type Translations } from '@/lib/i18n'
import { Card, cx } from './ui'

const ICON_MAP = Icons as unknown as Record<
  string,
  React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
>

const CAT_TONE: Record<string, string> = {
  itinerar: 'text-sea',
  batozina: 'text-primary',
  doklady: 'text-accent',
  vrstvy: 'text-sea',
  oblecenie: 'text-sea',
  obuv: 'text-accent',
  turistika: 'text-success',
  plaz: 'text-sea',
  mesto: 'text-primary',
  bicykel: 'text-success',
  sneh: 'text-sea',
  geocaching: 'text-success',
  auto: 'text-primary',
  hygiena: 'text-coral',
  lekarnicka: 'text-destructive',
  elektronika: 'text-primary',
  jedlo: 'text-accent',
  praca: 'text-primary',
  predodchodom: 'text-coral',
}

const BAG_META: Record<BagAssignment, { icon: typeof Backpack; key: keyof Translations }> = {
  osobna: { icon: Backpack, key: 'bagKindOsobna' },
  kabinova: { icon: Briefcase, key: 'bagKindKabinova' },
  odbavena: { icon: Luggage, key: 'bagKindOdbavena' },
  naSebe: { icon: Shirt, key: 'bagNaSebe' },
}

function catLabel(cat: string, t: Translations): string {
  const key = ('cat' + cat.charAt(0).toUpperCase() + cat.slice(1)) as keyof Translations
  return (t[key] as string) ?? cat
}

type Filter = 'all' | 'todo' | 'key'

export function PackingList({
  items,
  availableBags,
  onToggle,
  onDelete,
  onAdd,
  onQtyChange,
  onBagChange,
}: {
  items: PackItem[]
  availableBags: BagAssignment[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
  onBagChange: (id: string, bag: BagAssignment) => void
}) {
  const { t } = useLang()
  const [filter, setFilter] = useState<Filter>('all')
  const [bagFilter, setBagFilter] = useState<BagAssignment | null>(null)

  const done = items.filter((i) => i.checked).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  const visible = items.filter((i) => {
    if (filter === 'todo' && i.checked) return false
    if (filter === 'key' && !i.highlight) return false
    if (bagFilter && (i.bag ?? 'kabinova') !== bagFilter) return false
    return true
  })

  // Custom categories from AI or the user may fall outside CATEGORY_ORDER —
  // keep them instead of silently dropping the items.
  const known = CATEGORY_ORDER.filter((c) => visible.some((i) => i.category === c))
  const extra = [...new Set(visible.map((i) => i.category))].filter(
    (c) => !(CATEGORY_ORDER as readonly string[]).includes(c),
  )
  const categories = [...known, ...extra]

  const bagChoices: BagAssignment[] = [...availableBags, 'naSebe']

  return (
    <div className="flex flex-col gap-4">
      {/* Progress — sticky so it stays with you while scrolling a long list */}
      <div className="no-print sticky top-[57px] z-20 -mx-4 border-b border-border bg-background/92 px-4 py-2.5 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">
            {pct === 100 ? (
              <span className="flex items-center gap-1.5 text-success">
                <PartyPopper className="size-4" aria-hidden="true" />
                {t.allPacked}
              </span>
            ) : (
              <>
                {t.packed} <span className="tabular-nums">{done}</span> {t.of}{' '}
                <span className="tabular-nums">{items.length}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span className="font-bold tabular-nums text-primary">{pct} %</span>
            <button
              type="button"
              onClick={() => window.print()}
              title={t.printList}
              aria-label={t.printList}
              className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          aria-label={t.packed}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="rail mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(['all', 'todo', 'key'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cx(
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                filter === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {f === 'all' ? t.filterAll : f === 'todo' ? t.filterTodo : t.filterKey}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          {bagChoices.map((b) => {
            const meta = BAG_META[b]
            const Icon = meta.icon
            const active = bagFilter === b
            return (
              <button
                key={b}
                type="button"
                aria-pressed={active}
                onClick={() => setBagFilter(active ? null : b)}
                className={cx(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                  active
                    ? 'border-sea bg-sea text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
                {t[meta.key] as string}
              </button>
            )
          })}
        </div>
      </div>

      <div className="print-only hidden">
        <h2 className="font-display text-xl font-bold">{t.appName} — packlist</h2>
      </div>

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground">
          {t.empty}
        </p>
      )}

      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          label={catLabel(cat, t)}
          items={visible.filter((i) => i.category === cat)}
          totalInCategory={items.filter((i) => i.category === cat).length}
          bagChoices={bagChoices}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={onAdd}
          onQtyChange={onQtyChange}
          onBagChange={onBagChange}
          t={t}
        />
      ))}
    </div>
  )
}

function CategorySection({
  category,
  label,
  items,
  totalInCategory,
  bagChoices,
  onToggle,
  onDelete,
  onAdd,
  onQtyChange,
  onBagChange,
  t,
}: {
  category: string
  label: string
  items: PackItem[]
  totalInCategory: number
  bagChoices: BagAssignment[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (category: string, name: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
  onBagChange: (id: string, bag: BagAssignment) => void
  t: Translations
}) {
  const [newItem, setNewItem] = useState('')
  const done = items.filter((i) => i.checked).length
  const Icon = ICON_MAP[CATEGORY_ICONS[category] ?? 'FileText'] ?? FileText
  const tone = CAT_TONE[category] ?? 'text-primary'
  const litres = items.reduce((s, i) => s + (i.bag === 'naSebe' ? 0 : (i.litres ?? 0.15) * (i.qty ?? 1)), 0)

  function submit() {
    const v = newItem.trim()
    if (!v) return
    onAdd(category, v)
    setNewItem('')
  }

  return (
    <Card className="print-plain overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted', tone)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold">{label}</h3>
            {litres > 0 && (
              <p className="text-[11px] text-muted-foreground tabular-nums">~{Math.round(litres * 10) / 10} l</p>
            )}
          </div>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
            done === items.length && items.length > 0
              ? 'bg-success/15 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {done}/{items.length}
          {totalInCategory !== items.length && <span className="opacity-60"> · {totalInCategory}</span>}
        </span>
      </header>

      <ul>
        {items.map((it) => (
          <PackingItem
            key={it.id}
            item={it}
            bagChoices={bagChoices}
            onToggle={onToggle}
            onDelete={onDelete}
            onQtyChange={onQtyChange}
            onBagChange={onBagChange}
            t={t}
          />
        ))}
      </ul>

      <div className="no-print flex items-center gap-2 px-4 py-2.5">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
          placeholder={t.addItem}
          aria-label={`${t.addItemBtn} — ${label}`}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="button"
          onClick={submit}
          aria-label={t.addItemBtn}
          className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </Card>
  )
}

function PackingItem({
  item,
  bagChoices,
  onToggle,
  onDelete,
  onQtyChange,
  onBagChange,
  t,
}: {
  item: PackItem
  bagChoices: BagAssignment[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onQtyChange: (id: string, qty: number | undefined) => void
  onBagChange: (id: string, bag: BagAssignment) => void
  t: Translations
}) {
  const bag = item.bag ?? 'kabinova'
  const meta = BAG_META[bag] ?? BAG_META.kabinova
  const BagIcon = meta.icon
  // Pure checklist tasks ("charge the powerbank") occupy no space, so the
  // bag selector would be meaningless noise on them.
  const isTask = (item.litres ?? 0) === 0 && (item.grams ?? 0) === 0

  function cycleBag() {
    const order: BagAssignment[] = [...bagChoices]
    const idx = order.indexOf(bag)
    onBagChange(item.id, order[(idx + 1) % order.length] ?? order[0])
  }

  return (
    <li
      className={cx(
        'group flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0',
        item.aiAdded && 'bg-primary/[0.04]',
      )}
    >
      <input
        type="checkbox"
        id={`item-${item.id}`}
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className="size-5 shrink-0"
      />
      <label
        htmlFor={`item-${item.id}`}
        className={cx(
          'min-w-0 flex-1 cursor-pointer text-sm leading-relaxed',
          item.checked && 'text-muted-foreground line-through',
        )}
      >
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {item.highlight && !item.checked && (
            <Star className="size-3 shrink-0 fill-accent text-accent" aria-label={t.filterKey} />
          )}
          {item.name}
          {item.layer && !item.checked && (
            <span className="rounded-full bg-sea/15 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-sea">
              {item.layer}
            </span>
          )}
          {item.aiAdded && !item.checked && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              <Sparkles className="size-2.5" aria-hidden="true" />
              AI
            </span>
          )}
        </span>
        {item.note && <span className="ml-1.5 text-xs text-muted-foreground">({item.note})</span>}
      </label>

      {/* Bag assignment — one tap cycles through the bags you actually carry */}
      {!isTask && (
      <button
        type="button"
        onClick={cycleBag}
        title={`${t.moveTo}: ${t[meta.key] as string}`}
        aria-label={`${t.moveTo}: ${t[meta.key] as string}`}
        className={cx(
          'no-print flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
          bag === 'naSebe'
            ? 'border-accent/50 bg-accent/15 text-accent-foreground dark:text-accent'
            : 'border-border bg-muted text-muted-foreground hover:text-foreground',
        )}
      >
        <BagIcon className="size-3.5" aria-hidden="true" />
      </button>
      )}

      {item.qty != null && (
        <QtyControl item={item} onQtyChange={onQtyChange} t={t} />
      )}

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`${t.removeItem} ${item.name}`}
        className="no-print shrink-0 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:text-destructive focus:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}

function QtyControl({
  item,
  onQtyChange,
  t,
}: {
  item: PackItem
  onQtyChange: (id: string, qty: number | undefined) => void
  t: Translations
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(item.qty ?? ''))

  function commit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n > 0) onQtyChange(item.id, n)
    else if (draft === '' || draft === '0') onQtyChange(item.id, undefined)
    setEditing(false)
  }

  const cur = item.qty ?? 1

  return (
    <>
      <div className="no-print flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => (cur <= 1 ? onQtyChange(item.id, undefined) : onQtyChange(item.id, cur - 1))}
          aria-label="−"
          className="flex size-6 items-center justify-center rounded border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <Minus className="size-3" aria-hidden="true" />
        </button>
        {editing ? (
          <input
            type="number"
            min={1}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-11 rounded border border-ring bg-background px-1 py-0.5 text-center text-sm font-semibold tabular-nums outline-none"
            aria-label={t.qtyEdit}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(item.qty ?? ''))
              setEditing(true)
            }}
            title={t.qtyEdit}
            aria-label={t.qtyEdit}
            className="min-w-6 rounded px-1 text-center text-sm font-bold tabular-nums text-primary transition-colors hover:bg-primary/10"
          >
            {item.qty}×
          </button>
        )}
        <button
          type="button"
          onClick={() => onQtyChange(item.id, cur + 1)}
          aria-label="+"
          className="flex size-6 items-center justify-center rounded border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3" aria-hidden="true" />
        </button>
      </div>
      <span className="print-only ml-1 hidden text-sm font-semibold tabular-nums">{item.qty}×</span>
    </>
  )
}
