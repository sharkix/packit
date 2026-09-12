'use client'

import { AlertCircle, CheckCircle2, Compass, Sparkles } from 'lucide-react'
import { aiErrorMessage, type AiErrorReason } from '@/lib/ai-error'
import { useLang } from '@/lib/i18n'
import { cx } from './ui'

export type AiStatusValue = 'idle' | 'loading' | 'done' | 'error'

export function AiStatus({
  status,
  errorReason,
  reasoning,
  strategy,
  weatherNote,
}: {
  status: AiStatusValue
  errorReason?: AiErrorReason | null
  reasoning?: string
  strategy?: string
  weatherNote?: string
}) {
  const { t } = useLang()
  if (status === 'idle') return null

  const tone =
    status === 'loading'
      ? 'border-primary/30 bg-primary/5 text-primary'
      : status === 'done'
        ? 'border-success/30 bg-success/8 text-success'
        : 'border-destructive/30 bg-destructive/8 text-destructive'

  const Icon = status === 'loading' ? Sparkles : status === 'done' ? CheckCircle2 : AlertCircle

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('no-print rounded-2xl border px-4 py-3.5 text-sm', tone)}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cx('mt-0.5 size-4 shrink-0', status === 'loading' && 'animate-pulse')}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-semibold">
            {status === 'loading' ? t.aiStatusLoading : status === 'done' ? t.aiStatusDone : t.aiStatusError}
          </span>
          {status === 'error' && errorReason && errorReason !== 'other' && (
            <p className="leading-relaxed text-pretty">{aiErrorMessage(errorReason, t)}</p>
          )}
          {status === 'done' && strategy && (
            <p className="flex items-start gap-1.5 font-medium text-pretty">
              <Compass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-bold">{t.aiStrategy}: </span>
                {strategy}
              </span>
            </p>
          )}
          {status === 'done' && reasoning && (
            <p className="leading-relaxed opacity-90 text-pretty">{reasoning}</p>
          )}
          {status === 'done' && weatherNote && (
            <p className="italic opacity-80 text-pretty">{weatherNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}
