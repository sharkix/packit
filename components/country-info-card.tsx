'use client'

import {
  Zap,
  Banknote,
  ShieldCheck,
  HeartPulse,
  Lightbulb,
  Phone,
  Luggage,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { CountryInfo } from '@/lib/types'

interface CountryInfoCardProps {
  info: CountryInfo | null
  isLoading: boolean
  lang?: 'sk' | 'en'
}

export function CountryInfoCard({ info, isLoading, lang = 'sk' }: CountryInfoCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        <span>
          {lang === 'sk'
            ? 'AI zisťuje informácie o destinácii…'
            : 'AI is fetching destination info…'}
        </span>
      </div>
    )
  }

  if (!info) return null

  const t = {
    currency: lang === 'sk' ? 'Mena' : 'Currency',
    plug: lang === 'sk' ? 'Elektrina' : 'Electricity',
    visa: lang === 'sk' ? 'Víza / vstup' : 'Visa / entry',
    safety: lang === 'sk' ? 'Bezpečnosť' : 'Safety',
    health: lang === 'sk' ? 'Zdravie' : 'Health',
    tips: lang === 'sk' ? 'Praktické tipy' : 'Local tips',
    emergency: lang === 'sk' ? 'Tieseň' : 'Emergency',
    baggage: lang === 'sk' ? 'Batožina (AI)' : 'Baggage (AI)',
    noAdapter: lang === 'sk' ? 'Redukcia nie je potrebná' : 'No adapter needed',
    confidenceLow: lang === 'sk' ? 'nízka istota' : 'low confidence',
    confidenceMed: lang === 'sk' ? 'stredná istota' : 'medium confidence',
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">
        {lang === 'sk' ? 'Informácie o destinácii' : 'Destination info'}
      </h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Currency */}
        <InfoRow icon={Banknote} label={t.currency}>
          <span className="font-medium">{info.currency}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{info.cashTip}</span>
        </InfoRow>

        {/* Plug */}
        <InfoRow icon={Zap} label={t.plug}>
          <span className="font-medium">{info.plugAdapter.type} · {info.plugAdapter.voltage} / {info.plugAdapter.frequency}</span>
          {info.plugAdapter.needsAdapter ? (
            <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
              {info.plugAdapter.adapterNote}
            </span>
          ) : (
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.noAdapter}</span>
          )}
        </InfoRow>

        {/* Visa */}
        <InfoRow icon={ShieldCheck} label={t.visa}>
          <span className="text-xs leading-relaxed">{info.visaNote}</span>
        </InfoRow>

        {/* Safety */}
        {info.safetyNote && (
          <InfoRow icon={AlertCircle} label={t.safety}>
            <span className="text-xs leading-relaxed">{info.safetyNote}</span>
          </InfoRow>
        )}

        {/* Emergency number */}
        {info.emergencyNumber && info.emergencyNumber !== '112' && (
          <InfoRow icon={Phone} label={t.emergency}>
            <span className="font-mono text-sm font-bold">{info.emergencyNumber}</span>
          </InfoRow>
        )}

        {/* Baggage (AI-resolved) */}
        {info.baggageInfo && (
          <InfoRow icon={Luggage} label={t.baggage}>
            {info.baggageInfo.airline && (
              <span className="font-medium">{info.baggageInfo.airline}</span>
            )}
            {info.baggageInfo.cabinSize && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {lang === 'sk' ? 'Kabína:' : 'Cabin:'} {info.baggageInfo.cabinSize}
                {info.baggageInfo.cabinWeightKg ? ` · max. ${info.baggageInfo.cabinWeightKg} kg` : ''}
              </span>
            )}
            {info.baggageInfo.checkedWeightKg != null && (
              <span className="block text-xs text-muted-foreground">
                {lang === 'sk' ? 'Odbavená:' : 'Checked:'} max. {info.baggageInfo.checkedWeightKg} kg
              </span>
            )}
            {info.baggageInfo.priorityNote && (
              <span className="block text-xs italic text-muted-foreground">{info.baggageInfo.priorityNote}</span>
            )}
            {info.baggageInfo.confidence !== 'high' && (
              <span className="mt-0.5 block text-[10px] text-amber-600">
                ({info.baggageInfo.confidence === 'low' ? t.confidenceLow : t.confidenceMed})
              </span>
            )}
          </InfoRow>
        )}
      </div>

      {/* Health tips */}
      {info.healthTips && info.healthTips.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <HeartPulse className="size-3.5 text-rose-500" aria-hidden="true" />
            {t.health}
          </div>
          <ul className="ml-5 flex flex-col gap-0.5">
            {info.healthTips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Local tips */}
      {info.localTips && info.localTips.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Lightbulb className="size-3.5 text-amber-500" aria-hidden="true" />
            {t.tips}
          </div>
          <ul className="ml-5 flex flex-col gap-0.5">
            {info.localTips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {children}
      </div>
    </div>
  )
}
