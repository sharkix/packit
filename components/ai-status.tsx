'use client'

import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

type Status = 'idle' | 'loading' | 'done' | 'error'

const MESSAGES: Record<Status, string> = {
  idle: '',
  loading: 'AI analyzuje tvoju cestu a personalizuje zoznam…',
  done: 'Zoznam personalizovaný pomocou AI',
  error: 'AI personalizácia sa nepodarila. Základný zoznam je stále kompletný.',
}

const EN_MESSAGES: Record<Status, string> = {
  idle: '',
  loading: 'AI is analysing your trip and personalising the list…',
  done: 'List personalised by AI',
  error: 'AI personalisation failed. The base list is still complete.',
}

interface AiStatusProps {
  status: Status
  reasoning?: string
  weatherNote?: string
  lang?: 'sk' | 'en'
}

export function AiStatus({ status, reasoning, weatherNote, lang = 'sk' }: AiStatusProps) {
  if (status === 'idle') return null

  const msgs = lang === 'en' ? EN_MESSAGES : MESSAGES

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm transition-all duration-300 ${
        status === 'loading'
          ? 'border-primary/30 bg-primary/5 text-primary'
          : status === 'done'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="flex items-start gap-2">
        {status === 'loading' && (
          <Sparkles className="mt-0.5 size-4 shrink-0 animate-pulse" aria-hidden="true" />
        )}
        {status === 'done' && (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        {status === 'error' && (
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-1">
          <span className="font-medium">{msgs[status]}</span>
          {status === 'done' && reasoning && (
            <p className="text-emerald-700 leading-relaxed">{reasoning}</p>
          )}
          {status === 'done' && weatherNote && (
            <p className="mt-0.5 italic text-emerald-600">{weatherNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}
