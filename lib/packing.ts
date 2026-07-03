import type { PackItem, TripConfig, LuggageType, LuggagePiece } from './types'

// Map legacy single-select luggage type to the new multi-piece model
export function legacyLuggageToPieces(t: LuggageType | undefined): LuggagePiece[] {
  switch (t) {
    case 'ruksak': return ['osobna']
    case 'ruksak+kabinka': return ['osobna', 'kabinova']
    case 'kufor-velky': return ['osobna', 'odbavena']
    case 'kufor-maly':
    default:
      return ['kabinova']
  }
}

// Inverse: derive the closest legacy single-select value from the multi-piece model
// (kept so old saves / older app versions reading `luggageType` stay consistent)
export function piecesToLegacyLuggage(pieces: LuggagePiece[]): LuggageType {
  if (pieces.includes('odbavena')) return 'kufor-velky'
  if (pieces.includes('kabinova')) {
    return pieces.includes('osobna') ? 'ruksak+kabinka' : 'kufor-maly'
  }
  return 'ruksak'
}

export const CATEGORY_ORDER = [
  'doklady',
  'batazina',
  'oblecenie',
  'obuv',
  'hygiena',
  'lekarnicka',
  'elektronika',
  'plaz',
  'hory',
  'mesto',
  'auto',
  'geocaching',
  'vylet',
  'predodchodom',
] as const

// Category icon names (lucide-react icon names)
export const CATEGORY_ICONS: Record<string, string> = {
  doklady: 'FileText',
  batazina: 'Luggage',
  oblecenie: 'Shirt',
  obuv: 'Footprints',
  hygiena: 'Sparkles',
  lekarnicka: 'HeartPulse',
  elektronika: 'Smartphone',
  plaz: 'Waves',
  hory: 'Mountain',
  mesto: 'Building2',
  auto: 'Car',
  geocaching: 'Compass',
  vylet: 'Map',
  predodchodom: 'CheckSquare',
}

// Labels used server-side (SK default). UI uses i18n context instead.
export const CATEGORY_LABELS: Record<string, string> = {
  doklady: 'Doklady a peniaze',
  batazina: 'Batožina',
  oblecenie: 'Oblečenie',
  obuv: 'Obuv',
  hygiena: 'Hygiena',
  lekarnicka: 'Lekárnička',
  elektronika: 'Elektronika',
  plaz: 'Pláž a voda',
  hory: 'Hory a outdoor',
  mesto: 'Mesto a výlety',
  auto: 'Požičané auto',
  geocaching: 'Geocaching',
  vylet: 'Fakultatívny výlet',
  predodchodom: 'Pred odchodom',
}

export function generatePackingList(cfg: TripConfig): PackItem[] {
  const items: PackItem[] = []
  let n = 0

  const start = new Date(cfg.startDate + 'T00:00:00')
  const end = new Date(cfg.endDate + 'T00:00:00')
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  )

  const w = cfg.weather
  const hot = w?.hot ?? false
  const warm = w?.warm ?? false
  const cold = w?.cold ?? false
  const freezing = w?.freezing ?? false
  const rainy = w?.rainy ?? false
  const zena = cfg.gender === 'zena'
  const muz = cfg.gender === 'muz'
  const more = cfg.tripTypes.includes('more')
  const hory = cfg.tripTypes.includes('hory')
  const mesto = cfg.tripTypes.includes('mesto')
  const abroad =
    cfg.destination.country_code != null &&
    cfg.destination.country_code.toUpperCase() !== 'SK'

  const add = (category: string, name: string, qty?: number, note?: string) => {
    items.push({ id: `i${n++}`, category, name, qty, note, checked: false })
  }

  // ── Batožina ───────────────────────────────────────────────
  const flying = cfg.transport === 'lietadlo'
  const byCar = cfg.transport === 'auto'
  const byTrainBus = cfg.transport === 'vlak' || cfg.transport === 'autobus'

  if (flying) {
    const pieces: LuggagePiece[] = cfg.luggagePieces?.length
      ? cfg.luggagePieces
      : legacyLuggageToPieces(cfg.luggageType)
    const fi = cfg.flightInfo ?? null
    const hasOsobna = pieces.includes('osobna')
    const hasKabinova = pieces.includes('kabinova')
    const hasOdbavena = pieces.includes('odbavena')

    // Airline limits summary — first item so the user sees it immediately
    if (fi) {
      const limits = [
        `kabína ${fi.cabinBagSize}${fi.cabinBagWeight ? ` / max ${fi.cabinBagWeight} kg` : ''}`,
        fi.checkedBagWeight ? `odbavená max ${fi.checkedBagWeight} kg` : '',
      ].filter(Boolean).join(' · ')
      add('batazina', `Limity batožiny — ${fi.airline}`, undefined, limits)
    }

    if (hasOsobna) {
      // Personal-item dimensions differ per airline (Ryanair 40×20×25, Wizz 40×30×20, easyJet 45×36×20…)
      // so never hard-code them — reference the resolved airline when we have one
      const osobnaNote = hasKabinova || hasOdbavena
        ? fi
          ? `pod sedadlo — over rozmery osobnej batožiny (${fi.airline})`
          : 'pod sedadlo — over rozmery u leteckej spoločnosti'
        : 'jediná batožina — maximálna efektívnosť!'
      add('batazina', 'Malý batoh / ruksak (osobná batožina)', undefined, osobnaNote)
      if (!hasKabinova && !hasOdbavena) {
        add('batazina', 'Organizéry / packing cubes', undefined, 'šetria priestor')
      }
    }
    if (hasKabinova) {
      add('batazina', 'Kabínový kufrík', undefined,
        fi ? `${fi.cabinBagSize}${fi.cabinBagWeight ? ` / max ${fi.cabinBagWeight} kg — ${fi.airline}` : ` — ${fi.airline}`}` : 'do 55×40×20 cm, skontroluj rozmery')
      add('batazina', 'Kombináciový zámok na kufrík')
    }
    if (hasOdbavena) {
      add('batazina', 'Odbavený kufor', undefined,
        fi?.checkedBagWeight
          ? `max. ${fi.checkedBagWeight} kg — ${fi.airline}`
          : 'skontroluj váhový limit u leteckej spoločnosti')
      add('batazina', 'Kombináciový zámok TSA')
      add('batazina', 'Menovka na kufor', undefined, 'meno + telefón')
      add('batazina', 'Odvážiť kufor pred odchodom', undefined,
        fi?.checkedBagWeight ? `limit ${fi.checkedBagWeight} kg — nadváha je drahá` : 'nadváha je drahá')
    }

    if (fi && cfg.hasPriority && fi.priorityBoardingNote) {
      add('batazina', 'Priority boarding doklad', undefined, fi.priorityBoardingNote)
    }
    if (cfg.hasPaidBag) {
      add('batazina', 'Potvrdenie o zaplatení extra batožiny', undefined, 'stiahni do telefónu')
    }

    add('batazina', 'Balíčky < 100 ml v zip-lock vrecku', undefined, 'tekutiny do kabíny')
    add('batazina', 'Letenka / palubný lístok', undefined, 'stiahni offline do telefónu')
  } else if (byCar) {
    add('batazina', 'Kufor / cestovná taška', undefined, 'bez váhových limitov — ale nezabudni na miesto v aute')
    add('batazina', 'Chladiaca taška', undefined, 'jedlo a pitie na cestu')
  } else if (byTrainBus) {
    add('batazina', 'Kufor alebo batoh', undefined, 'mysli na prenášanie po schodoch a nástupištiach')
    add('batazina', 'Malý ruksak na cennosti', undefined, 'maj pri sebe, nie v batožinovom priestore')
    add('batazina', 'Cestovný lístok / miestenka', undefined, 'stiahni offline')
  } else {
    add('batazina', 'Batožina podľa spôsobu dopravy', undefined, cfg.transportOther || undefined)
  }
  add('batazina', 'Krabička na šperky / cennosti')

  // ── Vlastné auto (nie požičané) ────────────────────────────
  if (byCar) {
    add('auto', 'Vodičský preukaz + doklady od auta')
    add('auto', 'Zelená karta (poistenie)', undefined, 'povinná v zahraničí')
    add('auto', 'Diaľničná známka', undefined, 'skontroluj krajiny na trase')
    add('auto', 'Reflexná vesta + trojuholník', undefined, 'povinná výbava')
    add('auto', 'Lekárnička do auta', undefined, 'skontroluj expiráciu')
    add('auto', 'Nabíjačka do auta')
    add('auto', 'Offline mapy / GPS')
    add('auto', 'Voda a občerstvenie na cestu')
    if (freezing || cold) add('auto', 'Zimná výbava', undefined, 'reťaze, škrabka, zimné kvapaliny')
  }

  // ── Ubytovanie ─────────────────────────────────────────────
  const privat = cfg.accommodation === 'privat'
  const kemp = cfg.accommodation === 'kemp'
  if (privat) {
    add('hygiena', 'Uterák / osuška', undefined, 'v privátoch nemusia byť')
    add('hygiena', 'Sušič vlasov', undefined, 'over či je v apartmáne')
    add('hygiena', 'Toaletný papier na prvý deň')
    add('predodchodom', 'Základné potraviny na prvé ráno', undefined, 'káva, čaj, soľ — v apartmáne nič nie je')
    add('predodchodom', 'Prezuvky / papuče do apartmánu')
  } else if (kemp) {
    add('batazina', 'Stan + kolíky', undefined, 'skontroluj kompletnosť')
    add('batazina', 'Spací vak', undefined, 'podľa nočných teplôt')
    add('batazina', 'Karimatka / nafukovací matrac')
    add('hygiena', 'Uterák rýchloschnúci')
    add('hygiena', 'Toaletné potreby v prenosnej taške')
    add('batazina', 'Čelovka', undefined, 'nutnosť v kempe')
    add('batazina', 'Varič + riad', undefined, 'ak si varíš sám')
  }

  // ── Doklady a peniaze ──────────────────────────────────────
  add('doklady', 'Občiansky preukaz / pas')
  if (abroad) add('doklady', 'Cestovné poistenie', undefined, 'karta poistenca / potvrdenie')
  add('doklady', 'Platobné karty a hotovosť')
  add('doklady', 'Vodičský preukaz', undefined, 'ak plánuješ šoférovať')
  if (abroad) add('doklady', 'Kópie dokladov', undefined, 'aj v telefóne')

  // ── Oblečenie ──────────────────────────────────────────────
  const uw = Math.min(days + 1, 14)
  add('oblecenie', 'Spodná bielizeň', uw)
  add('oblecenie', 'Ponožky', uw)
  add('oblecenie', 'Tričká', Math.min(days + 1, 10))
  if (zena) {
    add('oblecenie', 'Podprsenky', Math.min(Math.ceil(days / 2) + 1, 5))
    if (hot || warm) add('oblecenie', 'Šaty / sukňa', Math.min(Math.ceil(days / 3), 3))
  }
  if (hot) {
    add('oblecenie', 'Kraťasy', Math.min(Math.ceil(days / 2), 4))
    add('oblecenie', 'Ľahká košeľa / top', 2)
    add('oblecenie', 'Šiltovka / klobúk')
  } else {
    add('oblecenie', 'Nohavice / rifle', Math.min(Math.ceil(days / 3) + 1, 4))
  }
  if (warm || hot) add('oblecenie', 'Mikina na večer', 1)
  if (!hot && !cold) {
    add('oblecenie', 'Mikina / sveter', 2)
    add('oblecenie', 'Ľahká bunda')
  }
  if (cold) {
    add('oblecenie', 'Teplá bunda')
    add('oblecenie', 'Sveter / flísová mikina', 2)
    add('oblecenie', 'Termo tričko', Math.min(Math.ceil(days / 2), 4))
    add('oblecenie', 'Čiapka')
    add('oblecenie', 'Rukavice')
    add('oblecenie', 'Šál / nákrčník')
  }
  if (freezing) add('oblecenie', 'Termo spodky / legíny', 2)
  if (rainy) add('oblecenie', 'Nepremokavá bunda / pršiplášť')
  add('oblecenie', 'Pyžamo')

  // ── Obuv ───────────────────────────────────────────────────
  add('obuv', 'Pohodlné tenisky')
  if (hot || more) add('obuv', 'Sandále / šľapky')
  if (hory) add('obuv', 'Turistická obuv')
  if (cold) add('obuv', 'Teplá / nepremokavá obuv')
  if (mesto && zena) add('obuv', 'Spoločenská obuv', undefined, 'na večer')

  // ── Hygiena ────────────────────────────────────────────────
  add('hygiena', 'Zubná kefka a pasta')
  add('hygiena', 'Dezodorant')
  add('hygiena', 'Sprchový gél / šampón', undefined, 'cestovné balenie')
  if (zena) {
    add('hygiena', 'Kozmetika a odličovanie')
    add('hygiena', 'Vložky / tampóny')
    add('hygiena', 'Gumičky / sponky do vlasov')
  }
  if (muz) add('hygiena', 'Holiaci strojček')
  add('hygiena', 'Hrebeň / kefa na vlasy')
  if (hot || more) add('hygiena', 'Opaľovací krém', undefined, 'SPF 30+')
  if (hot || more) add('hygiena', 'Krém po opaľovaní')
  if (cold) add('hygiena', 'Balzam na pery a krém na ruky')
  add('hygiena', 'Vlhčené utierky / dezinfekcia')

  // ── Lekárnička ─────────────────────────────────────────────
  add('lekarnicka', 'Lieky, ktoré pravidelne užívaš')
  add('lekarnicka', 'Lieky proti bolesti')
  add('lekarnicka', 'Náplasti')
  add('lekarnicka', 'Lieky na trávenie')
  if (abroad) add('lekarnicka', 'Lieky proti cestovnej nevoľnosti')
  if (hory) add('lekarnicka', 'Elastický obväz', undefined, 'na vyvrtnutie')
  if (hot || more || hory) add('lekarnicka', 'Repelent')

  // ── Elektronika ────────────────────────────────────────────
  add('elektronika', 'Telefón + nabíjačka')
  add('elektronika', 'Powerbanka')
  if (abroad) add('elektronika', 'Cestovný adaptér', undefined, 'over si typ zásuvky')
  add('elektronika', 'Slúchadlá')

  // ── Pláž a voda ────────────────────────────────────────────
  if (more) {
    add('plaz', zena ? 'Plavky (dámske)' : 'Plavky', 2)
    add('plaz', 'Plážová osuška / uterák')
    add('plaz', 'Slnečné okuliare')
    add('plaz', 'Plážová taška')
    add('plaz', 'Vodeodolné puzdro na telefón')
    if (zena) add('plaz', 'Plážové šaty / pareo')
  } else if (hot) {
    add('plaz', 'Slnečné okuliare')
    add('plaz', 'Plavky', undefined, 'hotel môže mať bazén')
  }

  // ── Hory a outdoor ─────────────────────────────────────────
  if (hory) {
    add('hory', 'Turistický ruksak')
    add('hory', 'Fľaša na vodu', undefined, 'min. 1 l')
    add('hory', 'Vetrovka / softshell')
    add('hory', 'Turistické ponožky', Math.min(Math.ceil(days / 2), 5))
    add('hory', 'Čelovka / baterka')
    add('hory', 'Mapa / offline mapy v telefóne')
    add('hory', 'Energetické tyčinky')
  }

  // ── Mesto a výlety ─────────────────────────────────────────
  if (mesto) {
    add('mesto', 'Malý batoh / crossbody taška')
    add('mesto', 'Fľaša na vodu')
    add('mesto', 'Vstupenky / rezervácie', undefined, 'stiahni si ich offline')
  }

  // ── Požičané auto ──────────────────────────────────────────
  if (cfg.carRental) {
    add('auto', 'Vodičský preukaz', undefined, 'medzinárodný, ak treba')
    add('auto', 'Kreditná karta', undefined, 'na depozit pri prenájme')
    add('auto', 'Zákaznícke číslo / rezervácia', undefined, 'stiahni offline')
    add('auto', 'Plán cesty / GPS / offline mapy')
    add('auto', 'Voda a občerstvenie na cestu')
    add('auto', 'Nabíjačka do auta / redukcia')
    add('auto', 'Lekárnička do auta', undefined, 'povinná v niektorých krajinách')
    add('auto', 'Reflexná vesta', undefined, 'povinná v niektorých krajinách')
  }

  // ── Geocaching ─────────────────────────────────────────────
  if (cfg.geocaching) {
    add('geocaching', 'Aplikácia Geocaching (c:geo / official)', undefined, 'nainštalovaná a prihlásená')
    add('geocaching', 'Premium členstvo / offline mapy')
    add('geocaching', 'Tužka / pero', undefined, 'na podpis do logbooku')
    add('geocaching', 'Malé predmety na výmenu (TOTT)')
    add('geocaching', 'Vodeodolné vrecko na telefón')
    add('geocaching', 'Pohodlná obuv do terénu')
    add('geocaching', 'Baterka', undefined, 'pre nočné kešky')
  }

  // ── Fakultatívny výlet ─────────────────────────────────────
  if (cfg.optionalTrip) {
    add('vylet', 'Rezervácia / lístok na výlet', undefined, 'stiahni offline')
    add('vylet', 'Pohodlná obuv na chôdzu')
    add('vylet', 'Batoh na deň')
    add('vylet', 'Fľaša na vodu')
    add('vylet', 'Opaľovací krém / šiltovka', undefined, 'ak je slnečno')
    add('vylet', 'Hotovosť na drobné', undefined, 'vstupné, suveníry')
    add('vylet', 'Nabíjaná powerbanka', undefined, 'na fotenie')
  }

  // ── Pred odchodom ──────────────────────────────────────────
  add('predodchodom', 'Vyniesť smeti')
  add('predodchodom', 'Vypnúť spotrebiče, skontrolovať okná')
  add('predodchodom', 'Zaliať kvety / zabezpečiť zvieratá')
  if (cfg.startTime)
    add('predodchodom', `Odchod o ${cfg.startTime}`, undefined, 'nastav si budík')
  add('predodchodom', 'Nabiť telefón a powerbanku')

  return items
}
