'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useLang, type Lang } from '@/lib/i18n'
import { useTheme, type Theme } from '@/lib/theme'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Pill-style toggle used everywhere for single- and multi-select choices. */
export function Chip({
  active,
  onClick,
  children,
  icon: Icon,
  title,
  size = 'md',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
  title?: string
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('eyebrow text-sea', className)}>{children}</p>
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {hint && <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25'

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  icon: Icon,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
        checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {Icon && (
            <Icon
              className={cx('size-4 shrink-0', checked ? 'text-primary' : 'text-muted-foreground')}
              aria-hidden="true"
            />
          )}
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLang()

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t.themeLight },
    { value: 'dark', icon: Moon, label: t.themeDark },
    { value: 'system', icon: Monitor, label: t.themeSystem },
  ]

  return (
    <div
      role="group"
      aria-label={t.theme}
      className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cx(
            'flex size-8 items-center justify-center rounded-full transition-colors',
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div
      role="group"
      aria-label="Jazyk / Language"
      className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 text-xs font-semibold"
    >
      {(['sk', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cx(
            'rounded-full px-2.5 py-1.5 transition-colors',
            lang === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
