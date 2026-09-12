'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Send, Sparkles, Wand2, X } from 'lucide-react'
import type { AiAssistantResult } from '@/app/api/ai-assistant/route'
import type { ChatMessage, PackItem, TripConfig } from '@/lib/types'
import { useLang } from '@/lib/i18n'
import { cx, inputClass } from './ui'

/**
 * Conversational layer over the packing list. The model answers in prose and
 * returns a patch in the same call, so "drop the second fleece" both explains
 * itself and actually changes the list.
 */
export function AiAssistant({
  open,
  onClose,
  cfg,
  items,
  onApply,
}: {
  open: boolean
  onClose: () => void
  cfg: TripConfig
  items: PackItem[]
  onApply: (result: AiAssistantResult) => void
}) {
  const { t } = useLang()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setError(false)
    const history = messages
    setMessages([...history, { role: 'user', content: message }])
    setBusy(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cfg, items, history, message }),
      })
      if (!res.ok) throw new Error('assistant failed')
      const result: AiAssistantResult = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply, changes: result.changeSummary },
      ])
      if (result.add?.length || result.remove?.length || result.update?.length) {
        onApply(result)
      }
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const suggestions = [t.aiSuggest1, t.aiSuggest2, t.aiSuggest3, t.aiSuggest4]

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.aiAskTitle}
        className="animate-rise relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:h-[min(38rem,85dvh)] sm:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold">{t.aiAskTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{t.aiAskHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.back}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground text-pretty">{t.aiAskHint}</p>
              <div className="mt-1 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <Wand2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <li
                key={i}
                className={cx('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-muted text-foreground',
                  )}
                >
                  {m.content}
                </div>
                {m.changes && m.changes.length > 0 && (
                  <ul className="flex max-w-[85%] flex-wrap gap-1">
                    {m.changes.map((c, j) => (
                      <li
                        key={j}
                        className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {busy && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              {t.aiThinking}
            </p>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" aria-hidden="true" />
              {t.aiError}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.aiAskPlaceholder}
            disabled={busy}
            className={cx(inputClass, 'flex-1 disabled:opacity-60')}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={t.aiSend}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="size-4.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4.5" aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

/** Floating trigger — present on the list view so AI is always one tap away. */
export function AiAssistantButton({ onClick }: { onClick: () => void }) {
  const { t } = useLang()
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:scale-105 active:scale-95"
    >
      <Sparkles className="size-4.5" aria-hidden="true" />
      {t.aiAsk}
    </button>
  )
}
