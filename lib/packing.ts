import type { PackItem, TripConfig } from './types'

export const CATEGORY_ORDER = [
  'doklady',
  'oblecenie',
  'obuv',
  'hygiena',
  'lekarnicka',
  'elektronika',
  'plaz',
  'hory',
  'mesto',
  'predodchodom',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  doklady: 'Doklady a peniaze',
  oblecenie: 'Oblečenie',
  obuv: 'Obuv',
  hygiena: 'Hygiena',
  lekarnicka: 'Lekárnička',
  elektronika: 'Elektronika',
  plaz: 'Pláž a voda',
  hory: 'Hory a outdoor',
  mesto: 'Mesto a výlety',
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

  // ── Pred odchodom ──────────────────────────────────────────
  add('predodchodom', 'Vyniesť smeti')
  add('predodchodom', 'Vypnúť spotrebiče, skontrolovať okná')
  add('predodchodom', 'Zaliať kvety / zabezpečiť zvieratá')
  if (cfg.startTime)
    add('predodchodom', `Odchod o ${cfg.startTime}`, undefined, 'nastav si budík')
  add('predodchodom', 'Nabiť telefón a powerbanku')

  return items
}
