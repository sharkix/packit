'use client'

import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useLang } from '@/lib/i18n'

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtShort(dateStr: string, lang: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (lang === 'en') {
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  }
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

export function DateRangePicker({
  startDate,
  endDate,
  startTime,
  endTime,
  onChange,
}: {
  startDate: string | null
  endDate: string | null
  startTime: string
  endTime: string
  onChange: (v: {
    startDate: string | null
    endDate: string | null
    startTime: string
    endTime: string
  }) => void
}) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [hoverDay, setHoverDay] = useState<string | null>(null)

  const todayStr = ymd(now)
  const DOW = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday]

  function pickDay(dateStr: string) {
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: dateStr, endDate: null, startTime, endTime })
    } else {
      if (dateStr < startDate) {
        onChange({ startDate: dateStr, endDate: startDate, startTime, endTime })
      } else {
        onChange({ startDate, endDate: dateStr, startTime, endTime })
      }
    }
  }

  function inRange(dateStr: string): boolean {
    if (!startDate) return false
    const end = endDate ?? hoverDay
    if (!end) return false
    const lo = startDate < end ? startDate : end
    const hi = startDate < end ? end : startDate
    return dateStr > lo && dateStr < hi
  }

  // Build calendar grid (Monday-first)
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: { date: Date; other: boolean }[] = []
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: new Date(viewYear, viewMonth, i - startDow + 1), other: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), other: false })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      other: true,
    })
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const nights =
    startDate && endDate
      ? Math.round(
          (new Date(endDate + 'T00:00:00').getTime() -
            new Date(startDate + 'T00:00:00').getTime()) /
            86400000,
        )
      : 0

  function dayLabel(n: number) {
    if (n === 1) return t.day
    if (n <= 4) return t.days2
    return t.days5
  }

  const rangeLabel = startDate && endDate
    ? `${fmtShort(startDate, lang)} – ${fmtShort(endDate, lang)} · ${nights + 1} ${dayLabel(nights + 1)}`
    : startDate
      ? t.pickReturn
      : t.pickDepart

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{t.tripDates}</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-3 text-left transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t.dateFrom}</span>
            <span className="block truncate text-sm font-medium">
              {startDate ? fmtShort(startDate, lang) : t.pickDate}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-3 text-left transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{t.dateTo}</span>
            <span className="block truncate text-sm font-medium">
              {endDate ? fmtShort(endDate, lang) : t.pickDate}
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              aria-label={t.prevMonth}
              className="rounded-md p-1.5 transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="font-semibold">
              {t.months[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label={t.nextMonth}
              className="rounded-md p-1.5 transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {DOW.map((d) => (
              <span key={d} className="py-1 text-xs font-semibold text-muted-foreground">
                {d}
              </span>
            ))}
            {cells.map(({ date, other }, i) => {
              const ds = ymd(date)
              const isPast = ds < todayStr
              const isStart = ds === startDate
              const isEnd = ds === endDate
              const isInRange = inRange(ds)
              const disabled = isPast

              let cls = 'relative mx-auto flex size-9 items-center justify-center rounded-full text-sm transition-colors '
              if (disabled) cls += 'text-muted-foreground/40 '
              else if (isStart || isEnd) cls += 'bg-primary text-primary-foreground font-semibold '
              else if (isInRange) cls += 'bg-primary/15 '
              else if (other) cls += 'text-muted-foreground/60 hover:bg-muted '
              else cls += 'hover:bg-muted '
              if (ds === todayStr && !isStart && !isEnd) cls += 'ring-1 ring-primary/50 '

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(ds)}
                  onMouseEnter={() => setHoverDay(ds)}
                  onMouseLeave={() => setHoverDay(null)}
                  className={cls}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">{rangeLabel}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!startDate || !endDate}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="startTime" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {t.timeDepart}
          </label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => onChange({ startDate, endDate, startTime: e.target.value, endTime })}
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {t.timeReturn}
          </label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => onChange({ startDate, endDate, startTime, endTime: e.target.value })}
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </div>
  )
}
