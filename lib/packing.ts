import type {
  ActivityKind,
  BagSpec,
  CapacityReport,
  ClimateRange,
  PackItem,
  TripConfig,
  TripLeg,
  WeatherSummary,
} from './types'

// ──────────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────────

export const CATEGORY_ORDER = [
  'itinerar',
  'batozina',
  'doklady',
  'vrstvy',
  'oblecenie',
  'obuv',
  'turistika',
  'plaz',
  'mesto',
  'bicykel',
  'sneh',
  'geocaching',
  'auto',
  'hygiena',
  'lekarnicka',
  'elektronika',
  'jedlo',
  'praca',
  'predodchodom',
] as const

export type Category = (typeof CATEGORY_ORDER)[number]

/** lucide-react icon name per category, resolved in the UI. */
export const CATEGORY_ICONS: Record<string, string> = {
  itinerar: 'Route',
  batozina: 'Luggage',
  doklady: 'FileText',
  vrstvy: 'Layers',
  oblecenie: 'Shirt',
  obuv: 'Footprints',
  turistika: 'Mountain',
  plaz: 'Waves',
  mesto: 'Building2',
  bicykel: 'Bike',
  sneh: 'Snowflake',
  geocaching: 'Compass',
  auto: 'Car',
  hygiena: 'Sparkles',
  lekarnicka: 'HeartPulse',
  elektronika: 'Smartphone',
  jedlo: 'Utensils',
  praca: 'Laptop',
  predodchodom: 'CheckSquare',
}

/** SK labels — used server-side in prompts. The UI uses the i18n dictionary. */
export const CATEGORY_LABELS: Record<string, string> = {
  itinerar: 'Itinerár a cesta',
  batozina: 'Batožina a organizácia',
  doklady: 'Doklady a peniaze',
  vrstvy: 'Vrstvenie (jadro šatníka)',
  oblecenie: 'Ostatné oblečenie',
  obuv: 'Obuv',
  turistika: 'Turistika a outdoor',
  plaz: 'Voda a pláž',
  mesto: 'Mesto a večery',
  bicykel: 'Bicykel',
  sneh: 'Sneh a zima',
  geocaching: 'Geocaching',
  auto: 'Auto',
  hygiena: 'Hygiena',
  lekarnicka: 'Lekárnička',
  elektronika: 'Elektronika',
  jedlo: 'Jedlo a pitie',
  praca: 'Práca na ceste',
  predodchodom: 'Pred odchodom',
}

// ──────────────────────────────────────────────────────────────────────────────
// Bag presets — used by the bag picker before AI resolves an exact model
// ──────────────────────────────────────────────────────────────────────────────

export const BAG_PRESETS: (Omit<BagSpec, 'id'> & { sk: string; en: string })[] = [
  {
    kind: 'osobna',
    sk: 'Malý batoh (pod sedadlo)',
    en: 'Small backpack (under seat)',
    litres: 20,
    dimensions: '40×20×25 cm',
    emptyWeightKg: 0.6,
  },
  {
    kind: 'kabinova',
    sk: 'Cestovný ruksak 40 l',
    en: 'Travel backpack 40 l',
    litres: 40,
    dimensions: '55×40×20 cm',
    emptyWeightKg: 1.5,
    maxWeightKg: 10,
  },
  {
    kind: 'kabinova',
    sk: 'Kabínový kufrík',
    en: 'Cabin suitcase',
    litres: 38,
    dimensions: '55×40×20 cm',
    emptyWeightKg: 2.8,
    maxWeightKg: 10,
  },
  {
    kind: 'odbavena',
    sk: 'Odbavený kufor',
    en: 'Checked suitcase',
    litres: 75,
    dimensions: '75×50×30 cm',
    emptyWeightKg: 4,
    maxWeightKg: 23,
  },
]

/** Rough packed volume of a bag as a share of its nominal litres. */
const USABLE_SHARE = 0.92

// ──────────────────────────────────────────────────────────────────────────────
// Climate aggregation across all legs
// ──────────────────────────────────────────────────────────────────────────────

export function legDays(leg: Pick<TripLeg, 'startDate' | 'endDate'>): number {
  if (!leg.startDate || !leg.endDate) return 0
  const a = new Date(leg.startDate + 'T00:00:00').getTime()
  const b = new Date(leg.endDate + 'T00:00:00').getTime()
  if (isNaN(a) || isNaN(b)) return 0
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export function tripDays(legs: TripLeg[]): number {
  const dated = legs.filter((l) => l.startDate && l.endDate)
  if (!dated.length) return 0
  const start = Math.min(...dated.map((l) => new Date(l.startDate + 'T00:00:00').getTime()))
  const end = Math.max(...dated.map((l) => new Date(l.endDate + 'T00:00:00').getTime()))
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

export function tripRange(legs: TripLeg[]): { start: string | null; end: string | null } {
  const dated = legs.filter((l) => l.startDate && l.endDate)
  if (!dated.length) return { start: null, end: null }
  const start = dated.reduce((m, l) => (l.startDate < m ? l.startDate : m), dated[0].startDate)
  const end = dated.reduce((m, l) => (l.endDate > m ? l.endDate : m), dated[0].endDate)
  return { start, end }
}

/**
 * Merge every leg's forecast into one range. On a moving trip the packing list
 * has to survive the COLDEST morning and the HOTTEST afternoon of the whole
 * itinerary, so we track the extremes, not the averages.
 */
export function aggregateClimate(legs: TripLeg[]): ClimateRange | null {
  const summaries = legs
    .map((l) => l.weather)
    .filter((w): w is WeatherSummary => !!w && w.days.length > 0)
  if (!summaries.length) return null

  const minT = Math.min(...summaries.map((w) => w.minT))
  const maxT = Math.max(...summaries.map((w) => w.maxT))
  const rainyDays = summaries.reduce((s, w) => s + w.rainyDays, 0)
  const totalDays = summaries.reduce((s, w) => s + w.days.length, 0)

  return {
    minT,
    maxT,
    spread: Math.round((maxT - minT) * 10) / 10,
    rainyDays,
    totalDays,
    hasFreezing: minT <= 1,
    hasHot: maxT >= 26,
    isEstimate: summaries.some((w) => w.isEstimate),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Quantity maths
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Clothing counts follow the one-bag rule: you do not pack one outfit per day.
 * With a laundry stop you carry ~5 days of rotation regardless of trip length;
 * without one you carry days+1, capped so the bag stays closable.
 */
export function wearCount(days: number, laundry: boolean, cap: number): number {
  const cycle = laundry ? Math.min(days, 5) : days
  return Math.max(2, Math.min(cycle + 1, cap))
}

// ──────────────────────────────────────────────────────────────────────────────
// Capacity
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Items marked `naSebe` are worn on travel days — they cost zero luggage volume.
 * That is the single biggest lever in carry-on-only travel, so the engine models
 * it explicitly instead of hiding it in a tip.
 */
export function computeCapacity(items: PackItem[], bags: BagSpec[]): CapacityReport {
  const packed = items.filter((i) => i.bag !== 'naSebe')

  const volOf = (i: PackItem) => (i.litres ?? 0.15) * (i.qty ?? 1)
  const wtOf = (i: PackItem) => (i.grams ?? 60) * (i.qty ?? 1)

  const usedLitres = packed.reduce((s, i) => s + volOf(i), 0)
  const contentKg = packed.reduce((s, i) => s + wtOf(i), 0) / 1000
  const bagsEmptyKg = bags.reduce((s, b) => s + (b.emptyWeightKg ?? 0), 0)
  const totalKg = contentKg + bagsEmptyKg

  const availableLitres = bags.reduce((s, b) => s + b.litres * USABLE_SHARE, 0)

  const perBag = bags.map((bag) => {
    const mine = packed.filter((i) => i.bag === bag.kind)
    const l = mine.reduce((s, i) => s + volOf(i), 0)
    const kg = mine.reduce((s, i) => s + wtOf(i), 0) / 1000 + (bag.emptyWeightKg ?? 0)
    const cap = bag.litres * USABLE_SHARE
    return {
      bag,
      usedLitres: Math.round(l * 10) / 10,
      fillPct: cap > 0 ? Math.round((l / cap) * 100) : 0,
      usedKg: Math.round(kg * 10) / 10,
      over: l > cap || (bag.maxWeightKg != null && kg > bag.maxWeightKg),
      rawKg: kg,
    }
  })

  // Only bags that carry a limit may be compared against one: summing a
  // 10 kg cabin allowance with an unlimited bag's contents would raise a
  // false alarm on every trip.
  const limited = perBag.filter((b) => b.bag.maxWeightKg != null)
  const maxKg = limited.length
    ? Math.round(limited.reduce((s, b) => s + (b.bag.maxWeightKg ?? 0), 0) * 10) / 10
    : null
  const limitedKg = Math.round(limited.reduce((s, b) => s + b.rawKg, 0) * 10) / 10

  return {
    usedLitres: Math.round(usedLitres * 10) / 10,
    availableLitres: Math.round(availableLitres * 10) / 10,
    fillPct: availableLitres > 0 ? Math.round((usedLitres / availableLitres) * 100) : 0,
    usedKg: Math.round(totalKg * 10) / 10,
    limitedKg,
    maxKg,
    overVolume: usedLitres > availableLitres,
    overWeight: maxKg != null && limitedKg > maxKg,
    anyBagOver: perBag.some((b) => b.over),
    perBag: perBag.map(({ rawKg: _rawKg, ...rest }) => rest),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// The generator
// ──────────────────────────────────────────────────────────────────────────────

interface AddOpts {
  qty?: number
  note?: string
  litres?: number
  grams?: number
  bag?: PackItem['bag']
  layer?: PackItem['layer']
  legIds?: string[]
  highlight?: boolean
}

export function generatePackingList(cfg: TripConfig): PackItem[] {
  const items: PackItem[] = []
  const seen = new Set<string>()
  let n = 0

  const legs = cfg.legs.filter((l) => l.destination && l.startDate && l.endDate)
  const days = tripDays(cfg.legs) || 1
  const climate = aggregateClimate(cfg.legs)

  // Default bag assignment: smallest bag the traveller carries that isn't the
  // personal item, so that clothing lands in the main bag by default.
  const bagKinds = new Set(cfg.bags.map((b) => b.kind))
  const mainBag: PackItem['bag'] = bagKinds.has('odbavena')
    ? 'odbavena'
    : bagKinds.has('kabinova')
      ? 'kabinova'
      : 'osobna'
  const carryOn: PackItem['bag'] = bagKinds.has('osobna') ? 'osobna' : mainBag

  function add(category: string, name: string, opts: AddOpts = {}) {
    const key = `${category}|${name.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    items.push({
      id: `i${n++}`,
      category,
      name,
      qty: opts.qty,
      note: opts.note,
      checked: false,
      litres: opts.litres,
      grams: opts.grams,
      bag: opts.bag ?? mainBag,
      layer: opts.layer,
      legIds: opts.legIds,
      highlight: opts.highlight,
    })
  }

  // ── Trip-wide facts ────────────────────────────────────────────────────────
  const activities = new Set<ActivityKind>(legs.flatMap((l) => l.activities))
  const has = (a: ActivityKind) => activities.has(a)
  const legsWith = (a: ActivityKind) => legs.filter((l) => l.activities.includes(a)).map((l) => l.id)

  const accoms = new Set(legs.map((l) => l.accommodation))
  const transports = new Set(legs.map((l) => l.transport))
  const flying = transports.has('lietadlo')
  const driving = transports.has('auto') || has('roadtrip')
  const publicTransport = transports.has('vlak') || transports.has('autobus')
  const ferry = transports.has('trajekt') || has('boat')
  const movingTrip = legs.length > 1

  const zena = cfg.gender === 'zena'
  const muz = cfg.gender === 'muz'
  const laundry = cfg.laundry
  const nabite = cfg.pace === 'nabite'

  const countries = new Set(
    legs.map((l) => l.destination?.country_code?.toUpperCase()).filter(Boolean) as string[],
  )
  const abroad = [...countries].some((c) => c !== 'SK')
  const multiCountry = countries.size > 1

  // Climate flags derived from the WHOLE trip, not one destination
  const minT = climate?.minT ?? 12
  const maxT = climate?.maxT ?? 22
  const spread = climate?.spread ?? 10
  const hot = maxT >= 26
  const warm = maxT >= 18
  const chilly = minT <= 12
  const cold = minT <= 5
  const freezing = climate?.hasFreezing ?? false
  const rainy = (climate?.rainyDays ?? 0) >= 1
  const bigSpread = spread >= 14

  // Luggage tightness drives how aggressive the list is
  const totalLitres = cfg.bags.reduce((s, b) => s + b.litres, 0)
  const tight = totalLitres > 0 && totalLitres <= 45
  const veryTight = totalLitres > 0 && totalLitres <= 30

  // ── Itinerary ──────────────────────────────────────────────────────────────
  if (movingTrip) {
    add('itinerar', `Plán presunov — ${legs.length} zastávok`, {
      note: legs.map((l) => l.destination?.name).filter(Boolean).join(' → '),
      litres: 0,
      grams: 0,
      bag: 'osobna',
      highlight: true,
    })
    add('itinerar', 'Offline mapy všetkých zastávok', {
      note: 'stiahni v Google Maps / Organic Maps — na presunoch často nie je signál',
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
    add('itinerar', 'Lístky na presuny medzi zastávkami', {
      note: 'vlaky, autobusy, trajekty — stiahni do telefónu aj offline',
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
    add('itinerar', 'Adresy a kontakty na všetky ubytovania', {
      note: 'v poznámkach v telefóne + vytlačené pre istotu',
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
    add('itinerar', 'Zoznam „čo nechať kde“', {
      note: 'ak niekde necháš časť vecí (úschovňa, prvý hotel)',
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
  }
  if (multiCountry) {
    add('itinerar', 'Roaming / eSIM pre každú krajinu', {
      note: [...countries].join(', '),
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
  }
  if (nabite) {
    add('itinerar', 'Rezerva času medzi presunmi', {
      note: 'nabitý program — nechaj si aspoň 60 min medzi spojmi',
      litres: 0,
      grams: 0,
      bag: 'osobna',
    })
  }

  // ── Bags & organisation ────────────────────────────────────────────────────
  for (const b of cfg.bags) {
    const kindLabel =
      b.kind === 'osobna' ? 'osobná batožina' : b.kind === 'kabinova' ? 'kabínová batožina' : 'odbavená batožina'
    add('batozina', b.model?.trim() || `Batožina — ${kindLabel}`, {
      note: [
        `${b.litres} l`,
        b.dimensions,
        b.maxWeightKg ? `limit ${b.maxWeightKg} kg` : null,
        b.note,
      ].filter(Boolean).join(' · '),
      litres: 0,
      grams: (b.emptyWeightKg ?? 0) * 1000,
      bag: b.kind,
      highlight: true,
    })
  }

  add('batozina', 'Packing cubes / organizéry', {
    qty: tight ? 3 : 2,
    note: veryTight
      ? 'pri takom malom objeme je kompresia povinná, nie voliteľná'
      : 'kompresné držia oblečenie stlačené a zoznam prehľadný',
    litres: 0.2,
    grams: 90,
    bag: mainBag,
    highlight: tight,
  })
  add('batozina', 'Vrecko na špinavú bielizeň', {
    note: 'oddelené od čistého — na aktívnom výlete sa to mieša rýchlo',
    litres: 0.1,
    grams: 40,
    bag: mainBag,
  })
  add('batozina', 'Skladací batoh na deň (10–15 l)', {
    note: 'na denné výlety; zložený zaberie skoro nič',
    litres: 0.4,
    grams: 180,
    bag: mainBag,
    highlight: true,
  })
  if (flying) {
    add('batozina', 'Tekutiny do 100 ml v priehľadnom zip vrecku', {
      note: 'max 1 l celkom — maj navrchu, na kontrole to vytiahneš',
      litres: 0.9,
      grams: 500,
      bag: carryOn,
      highlight: true,
    })
    add('batozina', 'Odvážiť a premerať batožinu doma', {
      note: cfg.flightInfo
        ? `${cfg.flightInfo.airline}: kabína ${cfg.flightInfo.cabinBagSize}${cfg.flightInfo.cabinBagWeight ? ` / ${cfg.flightInfo.cabinBagWeight} kg` : ''}`
        : 'rozmery aj váhu — doplatok na letisku je najdrahší suvenír',
      litres: 0,
      grams: 0,
      bag: 'naSebe',
      highlight: true,
    })
    if (bagKinds.has('odbavena')) {
      add('batozina', 'TSA zámok + menovka na kufor', { litres: 0.05, grams: 90, bag: 'odbavena' })
      add('batozina', 'Náhradné oblečenie v príručnej', {
        note: 'keby kufor priletel neskôr',
        litres: 0.8,
        grams: 300,
        bag: carryOn,
      })
    }
  }
  if (publicTransport || ferry) {
    add('batozina', 'Zámok na zips + lanko', {
      note: 'batožina v spoločnom priestore vlaku / trajektu',
      litres: 0.05,
      grams: 80,
      bag: carryOn,
    })
  }

  // ── Documents ──────────────────────────────────────────────────────────────
  add('doklady', 'Občiansky preukaz / pas', { litres: 0.05, grams: 40, bag: 'osobna', highlight: true })
  add('doklady', 'Platobné karty + hotovosť', { litres: 0.05, grams: 80, bag: 'osobna', highlight: true })
  add('doklady', 'Záložná karta oddelene od peňaženky', {
    note: 'pri aktívnom výlete sa peňaženka stráca najčastejšie',
    litres: 0.02,
    grams: 10,
    bag: mainBag,
  })
  if (abroad) {
    add('doklady', 'Cestovné poistenie', {
      note: 'pri turistike si over, či kryje aj horské aktivity',
      litres: 0.02,
      grams: 15,
      bag: 'osobna',
      highlight: true,
    })
    add('doklady', 'Európsky preukaz zdravotného poistenia (EPZP)', { litres: 0.01, grams: 5, bag: 'osobna' })
    add('doklady', 'Fotokópie dokladov v cloude aj offline', { litres: 0, grams: 0, bag: 'osobna' })
  }
  if (driving) add('doklady', 'Vodičský preukaz', { litres: 0.01, grams: 10, bag: 'osobna' })
  if (flying) add('doklady', 'Palubné lístky offline v telefóne', { litres: 0, grams: 0, bag: 'osobna' })

  // ── The layering system ────────────────────────────────────────────────────
  // Instead of "warm clothes" + "cold clothes", an active trip with a big
  // temperature spread packs one system of three layers that combine.
  const baseQty = wearCount(days, laundry, hot ? 6 : 5)

  add('vrstvy', 'Tričko — merino / funkčné', {
    qty: baseQty,
    note: laundry
      ? 'merino vydrží viac dní bez prania a rýchlo schne'
      : 'merino/syntetika namiesto bavlny — bavlna po potení nevyschne',
    litres: 0.7,
    grams: 150,
    layer: 'base',
    bag: mainBag,
    highlight: true,
  })
  if (chilly || bigSpread) {
    add('vrstvy', 'Tenká dlhorukávová vrstva (base layer)', {
      qty: bigSpread ? 2 : 1,
      note: `ráno ${Math.round(minT)} °C, cez deň ${Math.round(maxT)} °C — bez nej sa to nedá odstupňovať`,
      litres: 0.6,
      grams: 180,
      layer: 'base',
      bag: mainBag,
      highlight: bigSpread,
    })
  }
  add('vrstvy', chilly ? 'Fleece / mikina (mid layer)' : 'Ľahká mikina na večer', {
    qty: 1,
    note: 'hlavná izolácia — nos ju v deň cesty, v batožine zaberá najviac',
    litres: 2.2,
    grams: 400,
    layer: 'mid',
    bag: 'naSebe',
  })
  if (cold || freezing) {
    add('vrstvy', 'Páperová / primaloft bunda', {
      qty: 1,
      note: 'stlačiteľná do kompresného vrecka, teplo na ráno a večer',
      litres: 1.6,
      grams: 380,
      layer: 'mid',
      bag: mainBag,
      highlight: true,
    })
  }
  add('vrstvy', rainy || has('hiking') ? 'Nepremokavá bunda (shell)' : 'Vetrovka / ľahký shell', {
    qty: 1,
    note: rainy
      ? `${climate?.rainyDays ?? 0} daždivých dní v predpovedi — membrána, nie šuštiak`
      : 'chráni pred vetrom aj krátkym dažďom, váži skoro nič',
    litres: 1.2,
    grams: 330,
    layer: 'shell',
    bag: mainBag,
    highlight: rainy,
  })
  if (bigSpread) {
    add('vrstvy', 'Buff / nákrčník', {
      note: 'najlacnejší spôsob ako pridať teplo bez objemu',
      litres: 0.1,
      grams: 40,
      layer: 'base',
      bag: carryOn,
    })
  }

  // ── Other clothing ─────────────────────────────────────────────────────────
  add('oblecenie', 'Spodná bielizeň', {
    qty: wearCount(days, laundry, 7),
    litres: 0.15,
    grams: 55,
    bag: mainBag,
  })
  add('oblecenie', has('hiking') ? 'Turistické ponožky' : 'Ponožky', {
    qty: wearCount(days, laundry, 7),
    note: has('hiking') ? 'merino, bez švov na päte — proti pľuzgierom' : undefined,
    litres: 0.2,
    grams: 60,
    bag: mainBag,
  })
  if (zena) {
    add('oblecenie', 'Podprsenky', { qty: Math.min(Math.ceil(days / 3) + 1, 4), litres: 0.25, grams: 90, bag: mainBag })
    if (has('hiking') || has('running')) {
      add('oblecenie', 'Športová podprsenka', { qty: 2, litres: 0.25, grams: 110, bag: mainBag })
    }
  }
  add('oblecenie', has('hiking') ? 'Trekové nohavice (ideálne odopínateľné)' : 'Nohavice', {
    qty: days > 4 ? 2 : 1,
    note: has('hiking') ? 'jedny nohavice = dva kusy oblečenia, keď sa dajú skrátiť' : 'jedny nos v deň cesty',
    litres: 1.3,
    grams: 380,
    bag: mainBag,
  })
  if (warm || hot) {
    add('oblecenie', 'Kraťasy', {
      qty: hot ? 2 : 1,
      litres: 0.7,
      grams: 230,
      bag: mainBag,
    })
  }
  if (hot) {
    add('oblecenie', 'Šiltovka alebo klobúk', {
      note: `max ${Math.round(maxT)} °C — na chodníku nie je tieň`,
      litres: 0.4,
      grams: 90,
      bag: carryOn,
      highlight: true,
    })
  }
  if (zena && (hot || warm) && (has('city') || has('nightlife'))) {
    add('oblecenie', 'Šaty / sukňa (rýchloschnúce)', { qty: 1, litres: 0.5, grams: 220, bag: mainBag })
  }
  if (has('nightlife') || has('city')) {
    add('oblecenie', muz ? 'Košeľa na večer' : 'Elegantnejší kúsok na večer', {
      qty: 1,
      note: 'nekrčivá — v reštauráciách a kostoloch býva dress code',
      litres: 0.6,
      grams: 220,
      bag: mainBag,
    })
  }
  add('oblecenie', 'Pyžamo / oblečenie na spanie', {
    note: veryTight ? 'pri malom objeme stačí tričko a kraťasy, ktoré nosíš aj cez deň' : undefined,
    litres: 0.5,
    grams: 200,
    bag: mainBag,
  })
  if (freezing || cold) {
    add('oblecenie', 'Čiapka a rukavice', { litres: 0.4, grams: 130, bag: carryOn })
    add('oblecenie', 'Termo spodná vrstva', { qty: 1, litres: 0.6, grams: 250, bag: mainBag })
  }
  if (has('beach') || has('boat') || has('wellness')) {
    add('oblecenie', 'Plavky', { qty: 2, litres: 0.3, grams: 110, bag: mainBag })
  }

  // ── Footwear — the biggest volume decision in the whole bag ────────────────
  if (has('hiking') || has('climbing')) {
    add('obuv', 'Turistická obuv', {
      note: 'najobjemnejšia vec v batožine — v deň cesty ju maj na nohách',
      litres: 6,
      grams: 950,
      bag: 'naSebe',
      highlight: true,
    })
    add('obuv', 'Ľahké tenisky alebo sandále na večer', {
      note: tight ? 'iba jeden pár navyše — viac sa do batohu nezmestí' : undefined,
      litres: 2.5,
      grams: 450,
      bag: mainBag,
    })
  } else {
    add('obuv', 'Pohodlné tenisky na celý deň', {
      note: 'najobjemnejší pár nos v deň cesty',
      litres: 4,
      grams: 700,
      bag: 'naSebe',
      highlight: true,
    })
  }
  if (has('beach') || has('boat') || hot) {
    add('obuv', 'Sandále / šľapky', {
      note: has('beach') ? 'aj do sprchy a na horúce kamene' : undefined,
      litres: 1.2,
      grams: 300,
      bag: mainBag,
    })
  }
  if (has('hiking')) {
    add('obuv', 'Náplasti na pľuzgiere (Compeed)', {
      note: 'prvá vec, ktorá pokazí aktívny výlet',
      litres: 0.05,
      grams: 30,
      bag: 'osobna',
      highlight: true,
    })
  }

  // ── Activity gear ──────────────────────────────────────────────────────────
  if (has('hiking')) {
    const ids = legsWith('hiking')
    add('turistika', 'Fľaša na vodu 1 l alebo hydrovak', { litres: 0.8, grams: 160, bag: mainBag, legIds: ids, highlight: true })
    add('turistika', 'Trekové palice (skladacie)', { note: 'šetria kolená pri zostupoch', litres: 1.2, grams: 500, bag: mainBag, legIds: ids })
    add('turistika', 'Čelovka + náhradné batérie', { note: 'aj keď plánuješ byť dole pred tmou', litres: 0.3, grams: 110, bag: mainBag, legIds: ids })
    add('turistika', 'Energetické tyčinky / orechy', { qty: Math.min(days, 8), note: 'na chodníku nie je obchod', litres: 0.15, grams: 55, bag: mainBag, legIds: ids })
    add('turistika', 'Offline turistické mapy (Mapy.cz / Organic Maps)', { note: 'stiahni oblasť pred odchodom', litres: 0, grams: 0, bag: 'osobna', legIds: ids })
    add('turistika', 'Malá lekárnička na chodník', { note: 'náplasti, obväz, ibuprofen', litres: 0.4, grams: 180, bag: mainBag, legIds: ids })
    add('turistika', 'Pláštenka do batohu / pokrývka batoha', { litres: 0.2, grams: 90, bag: mainBag, legIds: ids })
    if (nabite) {
      add('turistika', 'Elektrolyty / iontový nápoj v prášku', { note: 'nabitý program a horúčavy', litres: 0.1, grams: 60, bag: mainBag, legIds: ids })
    }
  }
  if (has('climbing')) {
    const ids = legsWith('climbing')
    add('turistika', 'Ferratový set + úväz', { litres: 3, grams: 1300, bag: mainBag, legIds: ids, highlight: true })
    add('turistika', 'Prilba', { litres: 3.5, grams: 350, bag: mainBag, legIds: ids })
    add('turistika', 'Rukavice na ferratu', { litres: 0.2, grams: 90, bag: mainBag, legIds: ids })
  }
  if (has('beach')) {
    const ids = legsWith('beach')
    add('plaz', 'Rýchloschnúci uterák z mikrovlákna', { note: 'zaberie štvrtinu klasickej osušky', litres: 0.6, grams: 200, bag: mainBag, legIds: ids, highlight: true })
    add('plaz', 'Opaľovací krém SPF 50', { note: flying ? 'do 100 ml do kabíny, alebo kúp na mieste' : undefined, litres: 0.3, grams: 200, bag: mainBag, legIds: ids, highlight: true })
    add('plaz', 'Slnečné okuliare', { litres: 0.4, grams: 120, bag: 'osobna', legIds: ids })
    add('plaz', 'Vodeodolné puzdro na telefón', { litres: 0.1, grams: 50, bag: mainBag, legIds: ids })
    add('plaz', 'Neoprénové topánky do vody', { note: 'kamenisté pláže — bez nich sa nedá vojsť', litres: 0.8, grams: 280, bag: mainBag, legIds: ids })
  }
  if (has('boat')) {
    const ids = legsWith('boat')
    add('plaz', 'Tabletky proti morskej chorobe', { litres: 0.05, grams: 20, bag: 'osobna', legIds: ids })
    add('plaz', 'Vetrovka na palubu', { note: 'na vode je vždy chladnejšie ako na brehu', litres: 0.8, grams: 250, bag: mainBag, legIds: ids })
    add('plaz', 'Suché vrecko (dry bag) 5–10 l', { litres: 0.3, grams: 150, bag: mainBag, legIds: ids })
  }
  if (has('city') || has('nightlife')) {
    const ids = [...new Set([...legsWith('city'), ...legsWith('nightlife')])]
    add('mesto', 'Crossbody taška so zipsom', { note: 'proti vreckárom v dave', litres: 0.6, grams: 250, bag: mainBag, legIds: ids })
    add('mesto', 'Vstupenky a rezervácie offline', { note: 'na populárne miesta sa vstupenky vypredajú týždne dopredu', litres: 0, grams: 0, bag: 'osobna', legIds: ids })
    add('mesto', 'Skladacia fľaša na vodu', { note: 'v mestách sú pitné fontány', litres: 0.3, grams: 100, bag: mainBag, legIds: ids })
    if (has('city')) {
      add('mesto', 'Šatka / niečo na plecia', { note: 'do kostolov a chrámov s dress codom', litres: 0.3, grams: 120, bag: mainBag, legIds: ids })
    }
  }
  if (has('bike')) {
    const ids = legsWith('bike')
    add('bicykel', 'Cyklistické rukavice', { litres: 0.2, grams: 90, bag: mainBag, legIds: ids })
    add('bicykel', 'Cyklo kraťasy s vložkou', { litres: 0.5, grams: 200, bag: mainBag, legIds: ids })
    add('bicykel', 'Držiak telefónu na riadidlá', { litres: 0.3, grams: 120, bag: mainBag, legIds: ids })
    add('bicykel', 'Zámok na bicykel', { note: 'ak máš vlastný alebo dlhší prenájom', litres: 0.6, grams: 700, bag: mainBag, legIds: ids })
  }
  if (has('running')) {
    const ids = legsWith('running')
    add('oblecenie', 'Bežecké oblečenie', { qty: 2, litres: 0.6, grams: 220, bag: mainBag, legIds: ids })
    add('obuv', 'Bežecká obuv', { note: tight ? 'zváž, či ti nestačia turistické tenisky' : undefined, litres: 3.5, grams: 550, bag: mainBag, legIds: ids })
  }
  if (has('snow')) {
    const ids = legsWith('snow')
    add('sneh', 'Lyžiarske okuliare', { litres: 1.5, grams: 300, bag: mainBag, legIds: ids })
    add('sneh', 'Nepremokavé nohavice', { litres: 2, grams: 600, bag: mainBag, legIds: ids })
    add('sneh', 'Termo ponožky', { qty: 3, litres: 0.3, grams: 90, bag: mainBag, legIds: ids })
    add('sneh', 'Nezamŕzajúca fľaša / termoska', { litres: 0.8, grams: 350, bag: mainBag, legIds: ids })
  }
  if (has('geocaching')) {
    const ids = legsWith('geocaching')
    add('geocaching', 'Aplikácia + offline kešky stiahnuté', { note: 'c:geo / oficiálna app, prihlásený účet', litres: 0, grams: 0, bag: 'osobna', legIds: ids })
    add('geocaching', 'Pero na logbook', { litres: 0.02, grams: 10, bag: 'osobna', legIds: ids })
    add('geocaching', 'Predmety na výmenu (TOTT)', { litres: 0.2, grams: 80, bag: mainBag, legIds: ids })
    add('geocaching', 'Pinzeta a náhradné logbooky', { litres: 0.1, grams: 40, bag: mainBag, legIds: ids })
  }
  if (has('photo')) {
    const ids = legsWith('photo')
    add('elektronika', 'Fotoaparát + náhradná batéria', { litres: 2, grams: 900, bag: 'osobna', legIds: ids })
    add('elektronika', 'Pamäťové karty navyše', { litres: 0.05, grams: 20, bag: 'osobna', legIds: ids })
    add('elektronika', 'Mini statív / gorillapod', { note: 'na východy a západy slnka', litres: 0.6, grams: 300, bag: mainBag, legIds: ids })
    add('elektronika', 'Handrička na optiku', { litres: 0.02, grams: 10, bag: 'osobna', legIds: ids })
  }
  if (has('work')) {
    const ids = legsWith('work')
    add('praca', 'Notebook + nabíjačka', { litres: 2.5, grams: 1800, bag: 'osobna', legIds: ids })
    add('praca', 'Slúchadlá s potlačením hluku', { litres: 0.8, grams: 280, bag: 'osobna', legIds: ids })
    add('praca', 'Hotspot / eSIM dáta na hovory', { litres: 0, grams: 0, bag: 'osobna', legIds: ids })
  }
  if (has('wellness')) {
    const ids = legsWith('wellness')
    add('hygiena', 'Šľapky do wellness', { litres: 0.8, grams: 220, bag: mainBag, legIds: ids })
    add('hygiena', 'Uterák do sauny / župan', { note: 'over, či ho ubytovanie požičiava', litres: 1.5, grams: 400, bag: mainBag, legIds: ids })
  }

  // ── Car ────────────────────────────────────────────────────────────────────
  if (driving) {
    add('auto', 'Doklady od auta + zelená karta', { litres: 0.05, grams: 60, bag: 'osobna' })
    add('auto', 'Diaľničné známky pre všetky krajiny na trase', {
      note: multiCountry ? [...countries].join(', ') : undefined,
      litres: 0,
      grams: 0,
      bag: 'osobna',
      highlight: multiCountry,
    })
    add('auto', 'Reflexná vesta + trojuholník + lekárnička', { note: 'povinná výbava, líši sa podľa krajiny', litres: 2, grams: 900, bag: 'odbavena' })
    add('auto', 'Nabíjačka do auta + držiak telefónu', { litres: 0.3, grams: 150, bag: 'osobna' })
    add('auto', 'Voda a jedlo na cestu', { litres: 2, grams: 2000, bag: 'odbavena' })
    if (freezing || cold) add('auto', 'Škrabka, reťaze, zimné kvapaliny', { litres: 3, grams: 2500, bag: 'odbavena' })
  }

  // ── Toiletries ─────────────────────────────────────────────────────────────
  const liquidNote = flying ? 'do 100 ml — alebo tuhá alternatíva' : undefined
  add('hygiena', 'Zubná kefka a pasta', { litres: 0.25, grams: 120, bag: carryOn })
  add('hygiena', 'Dezodorant', { note: liquidNote, litres: 0.25, grams: 100, bag: mainBag })
  add('hygiena', flying ? 'Tuhý šampón a mydlo' : 'Sprchový gél a šampón', {
    note: flying ? 'nepočíta sa do limitu tekutín a nevytečie' : 'cestovné balenie',
    litres: 0.3,
    grams: 150,
    bag: mainBag,
  })
  if (accoms.has('privat') || accoms.has('hostel') || accoms.has('kemp') || accoms.has('chata')) {
    add('hygiena', 'Vlastný uterák', {
      note: 'privát, hostel, kemp a chata ho zvyčajne nedávajú',
      litres: 1.2,
      grams: 350,
      bag: mainBag,
      highlight: true,
    })
    add('hygiena', 'Toaletný papier na prvý deň', { litres: 0.4, grams: 120, bag: mainBag })
  }
  if (accoms.has('hostel')) {
    add('hygiena', 'Šľapky do sprchy', { litres: 0.6, grams: 180, bag: mainBag })
    add('batozina', 'Štuple do uší + maska na spanie', { note: 'spoločná izba', litres: 0.1, grams: 40, bag: carryOn })
    add('batozina', 'Visiaci zámok na skrinku', { litres: 0.1, grams: 120, bag: mainBag })
  }
  if (accoms.has('kemp')) {
    add('batozina', 'Stan, spacák, karimatka', { note: 'skontroluj kompletnosť pred odchodom', litres: 12, grams: 4000, bag: 'odbavena', highlight: true })
    add('jedlo', 'Varič, riad a príbor', { litres: 3, grams: 1200, bag: 'odbavena' })
  }
  if (zena) {
    add('hygiena', 'Menštruačné potreby', { note: 'na cestách sa cyklus posúva — ber aj keď nemá prísť', litres: 0.3, grams: 120, bag: carryOn })
    add('hygiena', 'Základná kozmetika', { note: liquidNote, litres: 0.6, grams: 300, bag: mainBag })
    add('hygiena', 'Gumičky a sponky do vlasov', { litres: 0.05, grams: 20, bag: carryOn })
  }
  if (muz) add('hygiena', 'Holiaci strojček', { litres: 0.3, grams: 150, bag: mainBag })
  add('hygiena', 'Hrebeň / kefa', { litres: 0.1, grams: 50, bag: mainBag })
  add('hygiena', 'Vlhčené utierky a dezinfekcia rúk', { litres: 0.25, grams: 120, bag: 'osobna' })
  if (hot || has('beach') || has('hiking')) {
    add('hygiena', 'Opaľovací krém na tvár + balzam na pery s SPF', { litres: 0.15, grams: 80, bag: 'osobna' })
  }
  if (cold || freezing) add('hygiena', 'Krém na ruky a balzam na pery', { litres: 0.1, grams: 60, bag: carryOn })

  // ── First aid ──────────────────────────────────────────────────────────────
  add('lekarnicka', 'Lieky, ktoré užívaš pravidelne', {
    note: 'v originálnom balení + recept, na celý pobyt s rezervou',
    litres: 0.3,
    grams: 150,
    bag: carryOn,
    highlight: true,
  })
  add('lekarnicka', 'Lieky proti bolesti a horúčke', { litres: 0.1, grams: 40, bag: carryOn })
  add('lekarnicka', 'Náplasti a dezinfekcia', { litres: 0.15, grams: 70, bag: carryOn })
  add('lekarnicka', 'Lieky na trávenie', { note: 'iná strava, iná voda', litres: 0.1, grams: 50, bag: mainBag })
  if (has('hiking') || has('climbing')) {
    add('lekarnicka', 'Elastický obväz', { note: 'vyvrtnutý členok je najčastejší úraz na chodníku', litres: 0.2, grams: 80, bag: mainBag })
    add('lekarnicka', 'Ibalgin gél / chladivý sprej na svaly', { litres: 0.2, grams: 110, bag: mainBag })
  }
  if (hot || has('beach') || has('hiking')) add('lekarnicka', 'Repelent', { note: liquidNote, litres: 0.2, grams: 120, bag: mainBag })
  if (driving || ferry) add('lekarnicka', 'Lieky proti nevoľnosti z cesty', { litres: 0.05, grams: 20, bag: 'osobna' })

  // ── Electronics ────────────────────────────────────────────────────────────
  add('elektronika', 'Telefón + nabíjačka', { litres: 0.5, grams: 350, bag: 'osobna', highlight: true })
  add('elektronika', 'Powerbanka 10 000 mAh', {
    note: flying ? 'VŽDY v príručnej batožine — v odbavenej je zakázaná' : 'na celodenné výlety',
    litres: 0.4,
    grams: 220,
    bag: 'osobna',
    highlight: flying,
  })
  add('elektronika', 'Nabíjacie káble + viacportová nabíjačka', {
    note: 'jedna nabíjačka na všetko namiesto štyroch adaptérov',
    litres: 0.4,
    grams: 200,
    bag: 'osobna',
  })
  if (abroad) {
    add('elektronika', 'Cestovná redukcia do zásuvky', { note: 'over typ zásuvky v každej krajine na trase', litres: 0.2, grams: 100, bag: 'osobna' })
  }
  add('elektronika', 'Slúchadlá', { litres: 0.2, grams: 60, bag: 'osobna' })
  if (movingTrip || days >= 5) {
    add('elektronika', 'AirTag / lokátor v hlavnej batožine', { note: 'pri viacerých presunoch sa batožina stráca ľahšie', litres: 0.02, grams: 12, bag: mainBag })
  }

  // ── Food & water ───────────────────────────────────────────────────────────
  if (has('hiking') || nabite || publicTransport) {
    add('jedlo', 'Jedlo na presun', { note: 'na dlhých presunoch často nie je nič otvorené', litres: 0.5, grams: 400, bag: 'osobna' })
  }
  if (abroad) {
    add('jedlo', 'Filtračná fľaša alebo tabletky na vodu', { note: 'ak nie je pitná voda z vodovodu', litres: 0.7, grams: 200, bag: mainBag })
  }

  // ── Before departure ───────────────────────────────────────────────────────
  add('predodchodom', 'Nabiť telefón, hodinky a powerbanku', { litres: 0, grams: 0, bag: 'naSebe' })
  add('predodchodom', 'Stiahnuť offline mapy, lístky a hudbu', { litres: 0, grams: 0, bag: 'naSebe' })
  add('predodchodom', 'Nahlásiť banke cestu / skontrolovať limity kariet', { litres: 0, grams: 0, bag: 'naSebe' })
  add('predodchodom', 'Vyniesť smeti, zaliať kvety, zabezpečiť zvieratá', { litres: 0, grams: 0, bag: 'naSebe' })
  add('predodchodom', 'Vypnúť spotrebiče, skontrolovať okná a vodu', { litres: 0, grams: 0, bag: 'naSebe' })
  add('predodchodom', 'Odfotiť obsah batožiny', { note: 'pomôže pri strate alebo poistnej udalosti', litres: 0, grams: 0, bag: 'naSebe' })
  if (flying) {
    add('predodchodom', 'Online check-in', { note: 'niektoré aerolinky účtujú check-in na letisku', litres: 0, grams: 0, bag: 'naSebe', highlight: true })
  }

  return items
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy migration — v1 saves had a single destination and a `luggageType`
// ──────────────────────────────────────────────────────────────────────────────

export function bagFromPreset(kind: BagSpec['kind'], id: string): BagSpec {
  const preset = BAG_PRESETS.find((p) => p.kind === kind) ?? BAG_PRESETS[1]
  return {
    id,
    kind,
    litres: preset.litres,
    dimensions: preset.dimensions,
    emptyWeightKg: preset.emptyWeightKg,
    maxWeightKg: preset.maxWeightKg,
  }
}
