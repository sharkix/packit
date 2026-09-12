'use client'

import {
  AlertCircle,
  Banknote,
  HeartPulse,
  Lightbulb,
  Loader2,
  Luggage,
  Phone,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import type { CountryInfo } from '@/lib/types'
import { useLang } from '@/lib/i18n'
import { Card, Eyebrow } from './ui'

export function CountryInfoCards({
  infos,
  isLoading,
}: {
  infos: CountryInfo[]
  isLoading: boolean
}) {
  const { t } = useLang()

  if (isLoading && infos.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary">
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        {t.destInfoLoading}
      </div>
    )
  }

  if (infos.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{t.destInfo}</Eyebrow>
        {isLoading && <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />}
      </div>
      {infos.map((info) => (
        <CountryCard key={info.country} info={info} />
      ))}
    </section>
  )
}

function CountryCard({ info }: { info: CountryInfo }) {
  const { t } = useLang()

  return (
    <Card className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <h3 className="font-display text-lg font-semibold">{info.country}</h3>

      <div className="grid gap-2 sm:grid-cols-2">
        <InfoRow icon={Banknote} label={t.infoCurrency}>
          <span className="font-medium">{info.currency}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">{info.cashTip}</span>
        </InfoRow>

        <InfoRow icon={Zap} label={t.infoPlug}>
          <span className="font-medium">
            {info.plugAdapter.type} · {info.plugAdapter.voltage}/{info.plugAdapter.frequency}
          </span>
          {info.plugAdapter.needsAdapter ? (
            <span className="mt-0.5 block text-xs font-medium text-warning">
              {info.plugAdapter.adapterNote}
            </span>
          ) : (
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.infoNoAdapter}</span>
          )}
        </InfoRow>

        <InfoRow icon={ShieldCheck} label={t.infoVisa}>
          <span className="text-xs leading-relaxed text-pretty">{info.visaNote}</span>
        </InfoRow>

        {info.safetyNote && (
          <InfoRow icon={AlertCircle} label={t.infoSafety}>
            <span className="text-xs leading-relaxed text-pretty">{info.safetyNote}</span>
          </InfoRow>
        )}

        {info.emergencyNumber && info.emergencyNumber !== '112' && (
          <InfoRow icon={Phone} label={t.infoEmergency}>
            <span className="font-mono text-sm font-bold">{info.emergencyNumber}</span>
          </InfoRow>
        )}

        {info.baggageInfo?.airline && (
          <InfoRow icon={Luggage} label={t.infoBaggage}>
            <span className="font-medium">{info.baggageInfo.airline}</span>
            {info.baggageInfo.cabinSize && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {info.baggageInfo.cabinSize}
                {info.baggageInfo.cabinWeightKg ? ` · ${info.baggageInfo.cabinWeightKg} kg` : ''}
              </span>
            )}
          </InfoRow>
        )}
      </div>

      {!!info.healthTips?.length && (
        <TipList icon={HeartPulse} tone="text-coral" label={t.infoHealth} tips={info.healthTips} />
      )}
      {!!info.localTips?.length && (
        <TipList icon={Lightbulb} tone="text-accent" label={t.infoTips} tips={info.localTips} />
      )}
    </Card>
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
    <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <span className="eyebrow block text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  )
}

function TipList({
  icon: Icon,
  tone,
  label,
  tips,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
  tone: string
  label: string
  tips: string[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-bold">
        <Icon className={`size-3.5 ${tone}`} aria-hidden="true" />
        {label}
      </span>
      <ul className="ml-5 flex list-disc flex-col gap-0.5">
        {tips.map((tip, i) => (
          <li key={i} className="text-xs text-muted-foreground text-pretty">
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}
