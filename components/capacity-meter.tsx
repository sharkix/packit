'use client'

import { AlertTriangle, Backpack, Briefcase, CheckCircle2, Gauge, Luggage, Scale, Shirt } from 'lucide-react'
import type { CapacityReport, LuggagePiece } from '@/lib/types'
import { useLang } from '@/lib/i18n'
import { Card, cx } from './ui'

const KIND_ICON: Record<LuggagePiece, typeof Backpack> = {
  osobna: Backpack,
  kabinova: Briefcase,
  odbavena: Luggage,
}

function toneFor(pct: number, over: boolean) {
  if (over || pct > 100) return { bar: 'bg-destructive', text: 'text-destructive' }
  if (pct >= 88) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-primary', text: 'text-primary' }
}

/**
 * The capacity meter is the honest answer to "will this actually fit?".
 * It counts only what goes INTO a bag — items worn on the travel day are
 * shown separately so the trick stays visible rather than magic.
 */
export function CapacityMeter({
  report,
  wornCount,
  onAskAi,
  compact = false,
}: {
  report: CapacityReport
  wornCount: number
  onAskAi?: () => void
  compact?: boolean
}) {
  const { t } = useLang()
  const over = report.overVolume || report.overWeight
  const tone = toneFor(report.fillPct, over)

  const verdict = over
    ? report.overVolume
      ? t.capacityOverVolume
      : t.capacityOverWeight
    : report.anyBagOver
      ? t.capacityRebalance
      : report.fillPct >= 88
        ? t.capacityTight
        : t.capacityOk
  const warn = over || report.anyBagOver

  return (
    <Card className={cx('overflow-hidden', compact && 'shadow-none')}>
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4 text-primary" aria-hidden="true" />
            {t.capacity}
          </span>
          <span className={cx('text-sm font-bold tabular-nums', tone.text)}>{report.fillPct} %</span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={Math.min(report.fillPct, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.capacity}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cx('h-full rounded-full transition-all duration-500', tone.bar)}
            style={{ width: `${Math.min(report.fillPct, 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <strong className="text-foreground">{report.usedLitres} {t.capacityLitres}</strong> {t.capacityOf}{' '}
            {report.availableLitres} {t.capacityLitres}
          </span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <Scale className="size-3.5" aria-hidden="true" />
            <strong className={cx(report.overWeight ? 'text-destructive' : 'text-foreground')}>
              {report.maxKg != null ? report.limitedKg : report.usedKg} kg
            </strong>
            {report.maxKg != null && ` ${t.capacityOf} ${report.maxKg} kg`}
          </span>
          {wornCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Shirt className="size-3.5" aria-hidden="true" />
              {wornCount} {t.capacityWorn}
            </span>
          )}
        </div>

        <p
          className={cx(
            'flex items-start gap-2 text-xs font-medium',
            over ? 'text-destructive' : warn || report.fillPct >= 88 ? 'text-warning' : 'text-success',
          )}
        >
          {warn ? (
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">{verdict}</span>
          {warn && onAskAi && (
            <button
              type="button"
              onClick={onAskAi}
              className="shrink-0 underline underline-offset-2 hover:no-underline"
            >
              {t.capacityAskAi}
            </button>
          )}
        </p>
      </div>

      {report.perBag.length > 1 && (
        <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          {report.perBag.map(({ bag, usedLitres, fillPct, usedKg, over: bagOver }) => {
            const Icon = KIND_ICON[bag.kind]
            const bagTone = toneFor(fillPct, bagOver)
            return (
              <li key={bag.id} className="flex items-center gap-3 bg-card px-4 py-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {bag.model ||
                      (bag.kind === 'osobna'
                        ? t.bagKindOsobna
                        : bag.kind === 'kabinova'
                          ? t.bagKindKabinova
                          : t.bagKindOdbavena)}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cx('h-full rounded-full', bagTone.bar)}
                      style={{ width: `${Math.min(fillPct, 100)}%` }}
                    />
                  </div>
                </div>
                <span className={cx('shrink-0 text-xs font-semibold tabular-nums', bagTone.text)}>
                  {usedLitres} l · {usedKg} kg
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
