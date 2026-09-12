import { ACTIVITY_LABELS_SK } from './activities'
import { CATEGORY_LABELS, aggregateClimate, computeCapacity, legDays, tripDays } from './packing'
import type { PackItem, TripConfig } from './types'

const TRANSPORT_SK: Record<string, string> = {
  lietadlo: 'lietadlom',
  auto: 'autom',
  vlak: 'vlakom',
  autobus: 'autobusom',
  trajekt: 'trajektom',
  peso: 'peši',
  ine: 'inak',
}

const ACCOM_SK: Record<string, string> = {
  hotel: 'hotel (uteráky a hygiena sú k dispozícii)',
  privat: 'apartmán/privát (NIE sú uteráky ani hygiena)',
  hostel: 'hostel (spoločná izba, vlastný uterák, zámok)',
  kemp: 'kemp (vlastné vybavenie)',
  chata: 'horská chata (spacák/vložka, vlastný uterák)',
  ine: 'iné',
}

const PACE_SK: Record<string, string> = {
  pokojne: 'pokojné tempo',
  stredne: 'stredné tempo',
  nabite: 'nabitý program — každý deň aktivita',
}

/**
 * The single source of truth for what the model is told about a trip.
 * Every AI route feeds from this so the packlist, the assistant and the day
 * plan all reason about exactly the same facts.
 */
export function describeTrip(cfg: TripConfig): string {
  const legs = cfg.legs.filter((l) => l.destination && l.startDate && l.endDate)
  const total = tripDays(cfg.legs)
  const climate = aggregateClimate(cfg.legs)

  const legLines = legs.map((l, i) => {
    const d = l.destination!
    const w = l.weather
    const where = [d.name, d.admin1, d.country].filter(Boolean).join(', ')
    const weather = w
      ? `${Math.round(w.minT)}–${Math.round(w.maxT)} °C, ${w.rainyDays} daždivých dní${w.isEstimate ? ' (odhad z minulého roka)' : ''}`
      : 'počasie neznáme'
    return [
      `ZASTÁVKA ${i + 1}: ${where}`,
      `  • termín: ${l.startDate} → ${l.endDate} (${legDays(l)} dní)`,
      d.elevation != null ? `  • nadmorská výška: ${Math.round(d.elevation)} m` : null,
      `  • doprava sem: ${TRANSPORT_SK[l.transport] ?? l.transport}${l.transport === 'ine' && l.transportOther ? ` (${l.transportOther})` : ''}`,
      `  • ubytovanie: ${ACCOM_SK[l.accommodation] ?? l.accommodation}${l.accommodation === 'ine' && l.accommodationOther ? ` (${l.accommodationOther})` : ''}`,
      `  • aktivity: ${l.activities.map((a) => ACTIVITY_LABELS_SK[a]).join(', ') || 'neuvedené'}`,
      `  • počasie: ${weather}`,
      l.notes ? `  • poznámka cestovateľa: ${l.notes}` : null,
    ].filter(Boolean).join('\n')
  })

  const bagLines = cfg.bags.map((b) => {
    const kind = b.kind === 'osobna' ? 'osobná (pod sedadlo)' : b.kind === 'kabinova' ? 'kabínová' : 'odbavená'
    return `  • ${b.model || kind}: ${b.litres} l${b.dimensions ? `, ${b.dimensions}` : ''}${b.maxWeightKg ? `, limit ${b.maxWeightKg} kg` : ''}${b.emptyWeightKg ? `, prázdna váži ${b.emptyWeightKg} kg` : ''} [${kind}]`
  })
  const totalLitres = cfg.bags.reduce((s, b) => s + b.litres, 0)

  const flight = cfg.flightInfo
    ? `${cfg.flightInfo.airline} (${cfg.flightInfo.iata}) — kabína ${cfg.flightInfo.cabinBagSize}${cfg.flightInfo.cabinBagWeight ? ` / ${cfg.flightInfo.cabinBagWeight} kg` : ''}${cfg.flightInfo.personalItemSize ? `, osobná batožina ${cfg.flightInfo.personalItemSize}` : ''}${cfg.flightInfo.checkedBagWeight ? `, odbavená ${cfg.flightInfo.checkedBagWeight} kg` : ''}${cfg.hasPriority ? ', má Priority' : ''}${cfg.hasPaidBag ? ', zaplatená extra batožina' : ''}`
    : cfg.flightNumber
      ? `číslo letu ${cfg.flightNumber} (pravidlá neoverené)`
      : 'let nezadaný'

  const countryLines = Object.values(cfg.countryInfos ?? {}).map((ci) =>
    [
      `  • ${ci.country}: mena ${ci.currency} — ${ci.cashTip}`,
      `    zásuvka ${ci.plugAdapter.type} ${ci.plugAdapter.voltage}/${ci.plugAdapter.frequency}${ci.plugAdapter.needsAdapter ? ` — TREBA REDUKCIU (${ci.plugAdapter.adapterNote ?? ''})` : ' — redukcia netreba'}`,
      `    vstup: ${ci.visaNote}`,
      ci.safetyNote ? `    bezpečnosť: ${ci.safetyNote}` : null,
      ci.healthTips?.length ? `    zdravie: ${ci.healthTips.join('; ')}` : null,
      ci.localTips?.length ? `    miestne: ${ci.localTips.join('; ')}` : null,
    ].filter(Boolean).join('\n'),
  )

  return `CESTA — ${legs.length > 1 ? `${legs.length} zastávok, aktívny presunový výlet` : 'jedna destinácia'}, spolu ${total} dní.

${legLines.join('\n\n')}

TEPLOTNÝ ROZSAH CELEJ CESTY: ${climate ? `${Math.round(climate.minT)} °C až ${Math.round(climate.maxT)} °C (rozptyl ${climate.spread} °C), ${climate.rainyDays} daždivých dní` : 'neznámy'}${climate && climate.spread >= 14 ? ' — VEĽKÝ ROZPTYL, rieš vrstvením, nie dvoma šatníkmi' : ''}

CESTOVATEĽ:
  • ${cfg.gender === 'zena' ? 'žena' : cfg.gender === 'muz' ? 'muž' : 'pohlavie neuvedené'}
  • tempo: ${PACE_SK[cfg.pace] ?? cfg.pace}
  • pranie počas cesty: ${cfg.laundry ? 'ÁNO — počíta s praním, takže menej oblečenia' : 'NIE — všetko oblečenie na celý pobyt'}
${cfg.personalNotes ? `  • vlastné poznámky: ${cfg.personalNotes}` : ''}

BATOŽINA (spolu ${totalLitres} l):
${bagLines.join('\n') || '  • neuvedená'}
  • let: ${flight}

KRAJINOVÉ INFO:
${countryLines.join('\n') || '  • zatiaľ nezistené'}`
}

/** Compact rendering of the current list, used by the assistant and the auditor. */
export function describeList(items: PackItem[], cfg: TripConfig): string {
  const cap = computeCapacity(items, cfg.bags)
  const byCat = new Map<string, PackItem[]>()
  for (const i of items) {
    const arr = byCat.get(i.category) ?? []
    arr.push(i)
    byCat.set(i.category, arr)
  }
  // One line per category rather than per item: the model needs to know what
  // is already covered, not the full record of each entry.
  const lines = [...byCat.entries()].map(([cat, list]) => {
    const names = list
      .map((i) => `${i.name}${i.qty ? ` ×${i.qty}` : ''}${i.bag === 'naSebe' ? '(na sebe)' : ''}`)
      .join(', ')
    return `  ${CATEGORY_LABELS[cat] ?? cat}: ${names}`
  })

  return `AKTUÁLNY ZOZNAM (${items.length} položiek):
${lines.join('\n')}

NAPLNENOSŤ BATOŽINY: ${cap.usedLitres} l z ${cap.availableLitres} l (${cap.fillPct} %), hmotnosť spolu ~${cap.usedKg} kg${cap.maxKg != null ? `, v limitovaných batožinách ${cap.limitedKg} kg z ${cap.maxKg} kg` : ''}${cap.overVolume ? ' — PRETEČENÝ OBJEM!' : ''}${cap.overWeight ? ' — PREKROČENÁ VÁHA!' : ''}${!cap.overVolume && cap.anyBagOver ? ' — celkovo sa zmestí, ale jedna batožina je preplnená' : ''}
PODĽA BATOŽÍN:
${cap.perBag.map((b) => `  • ${b.bag.model || b.bag.kind}: ${b.usedLitres} l (${b.fillPct} %), ${b.usedKg} kg${b.bag.maxWeightKg ? ` z ${b.bag.maxWeightKg} kg` : ''}${b.over ? ' — PREPLNENÁ' : ''}`).join('\n')}`
}

export const CATEGORY_ENUM = [
  'itinerar', 'batozina', 'doklady', 'vrstvy', 'oblecenie', 'obuv',
  'turistika', 'plaz', 'mesto', 'bicykel', 'sneh', 'geocaching', 'auto',
  'hygiena', 'lekarnicka', 'elektronika', 'jedlo', 'praca', 'predodchodom',
] as const

export const PACKING_PRINCIPLES = `ZÁSADY DOBRÉHO PACKLISTU (drž sa ich):
1. VRSTVENIE namiesto dvoch šatníkov. Pri veľkom teplotnom rozptyle sa nebalia zvlášť „letné" a „zimné" veci, ale systém base (merino tričko) → mid (fleece/páperovka) → shell (nepremokavá bunda). Tri vrstvy pokryjú 0 až 25 °C.
2. NIE JEDEN OUTFIT NA DEŇ. Počty oblečenia počítaj na rotáciu: s praním ~5 dní, bez prania dni+1, s hornou hranicou podľa objemu batožiny.
3. NAJOBJEMNEJŠIE VECI SA NOSIA NA SEBE v deň cesty (topánky, mikina, bunda) — v batožine nezaberajú nič. Označ ich bag="naSebe".
4. JEDNY TOPÁNKY navyše, nie tri. Obuv je najväčší objem v batohu.
5. REÁLNY OBJEM. Každá položka má odhad litrov a gramov. Súčet musí sadnúť do batožiny — ak nie, radšej uber, než pridávaj.
6. TEKUTINY pri lete: 100 ml v priehľadnom vrecku; tuhý šampón/mydlo sa do limitu nepočíta.
7. MULTIFUNKČNOSŤ. Jedna vec, ktorá zastane dve, vyhráva (odopínateľné nohavice, buff, mikrovláknový uterák).
8. DOKLADY, LIEKY, POWERBANKA a náhradné oblečenie patria do príručnej — nikdy nie do odbavenej.
9. PRI PRESUNOCH (viac zastávok) rieš aj logistiku: offline mapy, lístky, adresy, čo nechať v úschovni.
10. KONKRÉTNE, NIE VŠEOBECNÉ. „Merino tričko 3×" áno, „nejaké oblečenie" nie.`
