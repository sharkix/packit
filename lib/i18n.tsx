'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Lang = 'sk' | 'en'

const STORAGE_KEY = 'packit_lang'

const SK = {
  appName: 'Zbalené?',
  appTagline: 'Plánovač balenia pre aktívne cesty s presunmi a jedným ruksakom.',
  heroEyebrow: 'Inteligentný packlist',
  heroTitle: 'Zbaľ sa raz. Na celú cestu.',
  heroCopy:
    'Poskladaj si trasu zo zastávok, povedz nám čo tam budeš robiť a do akého ruksaku sa to má vojsť. Zvyšok dorieši AI.',

  // Steps
  stepRoute: 'Trasa',
  stepYou: 'Ty a tempo',
  stepBags: 'Batožina',
  stepList: 'Packlist',
  stepRouteHint: 'Zastávky, dátumy a aktivity',
  stepYouHint: 'Pre koho balíme',
  stepBagsHint: 'Do čoho sa to musí zmestiť',
  stepListHint: 'Hotový zoznam s AI',

  // Legs
  legs: 'Zastávky cesty',
  legsHint: 'Pridaj každé miesto, kde prespíš. Pri viacerých zastávkach počítame s presunmi.',
  leg: 'Zastávka',
  addLeg: 'Pridať zastávku',
  removeLeg: 'Odstrániť zastávku',
  legNotes: 'Poznámka k zastávke (voliteľné)',
  legNotesPlaceholder: 'Napr. dva dni chceme na Path of the Gods…',
  activities: 'Čo tam budeš robiť?',
  activitiesHint: '(vyber všetko, čo platí — ovplyvní to výbavu)',
  destination: 'Destinácia',
  destinationPlaceholder: 'Kam? Napr. Amalfi, Vysoké Tatry, Tirana…',
  transport: 'Ako sa tam dostaneš?',
  accommodation: 'Kde budeš spať?',
  dateFrom: 'Od',
  dateTo: 'Do',
  pickDate: 'Vybrať dátum',
  pickDepart: 'Vyber dátum príchodu',
  pickReturn: 'Vyber dátum odchodu',
  done: 'Hotovo',

  // Traveller
  packFor: 'Balím pre',
  genderWoman: 'Ženu',
  genderMan: 'Muža',
  genderUnspecified: 'Nechcem uviesť',
  pace: 'Tempo cesty',
  pacePokojne: 'Pokojné',
  paceStredne: 'Stredné',
  paceNabite: 'Nabité',
  pacePokojneHint: 'Veľa oddychu, málo presunov',
  paceStredneHint: 'Aktivita a oddych striedavo',
  paceNabiteHint: 'Každý deň niečo, málo pauzy',
  laundry: 'Počas cesty budem prať',
  laundryHint: 'Výrazne zníži počet kusov oblečenia — najsilnejší trik pri jednom ruksaku',
  personalNotes: 'Niečo, čo máme vedieť?',
  personalNotesPlaceholder: 'Alergie, lieky, výbava ktorú už máš, deti, špeciálne požiadavky…',

  // Bags
  bags: 'Tvoja batožina',
  bagsHint: 'Zadaj presný model ruksaku alebo kufra — AI zistí rozmery a overí, či prejde do kabíny.',
  addBag: 'Pridať batožinu',
  removeBag: 'Odstrániť',
  bagModel: 'Model batožiny',
  bagModelPlaceholder: 'Napr. Osprey Farpoint 40, Samsonite Base Boost…',
  bagLookup: 'Zistiť parametre',
  bagLitres: 'Objem (l)',
  bagWeightLimit: 'Limit (kg)',
  bagKindOsobna: 'Osobná (pod sedadlo)',
  bagKindKabinova: 'Kabínová',
  bagKindOdbavena: 'Odbavená',
  bagFitsCabin: 'Prejde ako kabínová',
  bagFitsUnderSeat: 'Prejde pod sedadlo',
  bagTooBig: 'Cez limit kabíny',
  flightNumber: 'Číslo letu (voliteľné)',
  flightNumberPlaceholder: 'napr. FR1234, W6 5678',
  flightSearch: 'Hľadať',
  orPickAirline: 'Alebo vyber leteckú spoločnosť',
  hasPriority: 'Mám Priority boarding',
  hasPriorityHint: 'Väčší kufrík do kabíny + prednostný nástup',
  hasPaidBag: 'Mám zaplatenú väčšiu batožinu',
  hasPaidBagHint: 'Zaznamená váhový limit do packlistu',
  airlineNotFound:
    'Spoločnosť sa nepodarilo rozpoznať. Skontroluj formát čísla letu alebo pravidlá na webe dopravcu.',

  // Capacity
  capacity: 'Naplnenosť batožiny',
  capacityUsed: 'obsadené',
  capacityOf: 'z',
  capacityLitres: 'l',
  capacityWeight: 'Hmotnosť',
  capacityOverVolume: 'Toto sa do batožiny nezmestí — treba uberať.',
  capacityOverWeight: 'Prekročíš váhový limit — doplatok na letisku je drahý.',
  capacityTight: 'Tesné, ale s kompresiou to vyjde.',
  capacityRebalance: 'Celkovo sa to zmestí, ale jedna batožina je preplnená — presuň časť vecí.',
  capacityOk: 'Máš rezervu, zmestí sa to v pohode.',
  capacityWorn: 'na sebe v deň cesty',
  capacityAskAi: 'Čo vyhodiť?',

  // List
  generate: 'Vygenerovať packlist',
  regenerate: 'Prepočítať zoznam',
  generating: 'Počítam…',
  regenerateWarn: 'Nový zoznam vymaže odškrtnuté položky.',
  packed: 'Zbalené',
  of: 'z',
  allPacked: 'Všetko zbalené!',
  addItem: 'Pridať vlastnú položku…',
  addItemBtn: 'Pridať',
  removeItem: 'Odstrániť',
  printList: 'Vytlačiť',
  editTrip: 'Upraviť cestu',
  backToList: 'Späť na zoznam',
  filterAll: 'Všetko',
  filterTodo: 'Nezbalené',
  filterKey: 'Kľúčové',
  bagFilter: 'Podľa batožiny',
  bagNaSebe: 'Na sebe',
  qtyEdit: 'Upraviť počet',
  moveTo: 'Presunúť do',
  empty: 'Zatiaľ nič — vygeneruj zoznam.',

  // Weather
  weatherTitle: 'Počasie',
  weatherRange: 'Rozsah teplôt celej cesty',
  weatherSpread: 'rozptyl',
  weatherDayAvg: 'Cez deň',
  weatherNight: 'V noci',
  weatherNoRain: 'Bez dažďa',
  weatherRain1: 'daždivý deň',
  weatherRain2: 'daždivé dni',
  weatherRain5: 'daždivých dní',
  weatherEstimate: 'Odhad podľa minulého roka',
  weatherLoading: 'Zisťujem počasie',
  weatherError: 'Počasie sa nepodarilo načítať — zoznam vygenerujeme aj bez neho.',
  layeringWarn:
    'Veľký teplotný rozptyl — zoznam je postavený na vrstvení, nie na dvoch šatníkoch.',

  // AI
  aiStatusLoading: 'AI analyzuje cestu a dolaďuje zoznam…',
  aiStatusDone: 'Zoznam doladený AI',
  aiStatusError: 'AI doladenie zlyhalo. Základný zoznam je kompletný.',
  aiStrategy: 'Stratégia balenia',
  aiAsk: 'Opýtaj sa AI',
  aiAskTitle: 'AI asistent balenia',
  aiAskHint: 'Pýtaj sa alebo priamo prikazuj — zoznam sa upraví.',
  aiAskPlaceholder: 'Napr. „Nechcem brať druhú mikinu, čo namiesto nej?“',
  aiSend: 'Poslať',
  aiThinking: 'Rozmýšľam…',
  aiChanged: 'Zmenené',
  aiError: 'Asistent neodpovedal. Skús to znova.',
  aiSuggest1: 'Zmestí sa mi to do batožiny?',
  aiSuggest2: 'Čo môžem vyhodiť?',
  aiSuggest3: 'Čo mi chýba na daždivý deň?',
  aiSuggest4: 'Zjednoduš zoznam na minimum',

  // Itinerary
  dayPlan: 'Plán dňa po dni',
  dayPlanHint: 'AI navrhne program, oblečenie na každý deň a čo si dať do denného batoha.',
  dayPlanGenerate: 'Navrhnúť plán',
  dayPlanLoading: 'Skladám itinerár…',
  dayPlanError: 'Itinerár sa nepodarilo vytvoriť.',
  dayOutfit: 'Na seba',
  dayBag: 'Do denného batoha',
  dayWatchOut: 'Pozor',
  dayPackingImplications: 'Čo z toho vyplýva pre balenie',
  intensityOddych: 'Oddych',
  intensityStredna: 'Stredná',
  intensityNarocna: 'Náročná',

  // Destination info
  destInfo: 'Informácie o destinácii',
  destInfoLoading: 'AI zisťuje info o destinácii…',
  infoCurrency: 'Mena',
  infoPlug: 'Elektrina',
  infoVisa: 'Vstup',
  infoSafety: 'Bezpečnosť',
  infoHealth: 'Zdravie',
  infoTips: 'Praktické tipy',
  infoEmergency: 'Tieseň',
  infoBaggage: 'Batožina (AI)',
  infoNoAdapter: 'Redukcia nie je potrebná',

  // Categories
  catItinerar: 'Itinerár a cesta',
  catBatozina: 'Batožina a organizácia',
  catDoklady: 'Doklady a peniaze',
  catVrstvy: 'Vrstvenie',
  catOblecenie: 'Ostatné oblečenie',
  catObuv: 'Obuv',
  catTuristika: 'Turistika a outdoor',
  catPlaz: 'Voda a pláž',
  catMesto: 'Mesto a večery',
  catBicykel: 'Bicykel',
  catSneh: 'Sneh a zima',
  catGeocaching: 'Geocaching',
  catAuto: 'Auto',
  catHygiena: 'Hygiena',
  catLekarnicka: 'Lekárnička',
  catElektronika: 'Elektronika',
  catJedlo: 'Jedlo a pitie',
  catPraca: 'Práca na ceste',
  catPredodchodom: 'Pred odchodom',

  // Transport
  transportPlane: 'Lietadlo',
  transportCar: 'Auto',
  transportTrain: 'Vlak',
  transportBus: 'Autobus',
  transportFerry: 'Trajekt',
  transportWalk: 'Peši',
  transportOther: 'Iné',
  transportOtherPlaceholder: 'Napíš ako — napr. na bicykli…',

  // Accommodation
  accomHotel: 'Hotel',
  accomPrivat: 'Apartmán',
  accomHostel: 'Hostel',
  accomKemp: 'Kemp',
  accomChata: 'Chata',
  accomOther: 'Iné',
  accomOtherPlaceholder: 'Napíš kde — napr. u známych…',

  // Misc
  day: 'deň',
  days2: 'dni',
  days5: 'dní',
  night: 'noc',
  nights2: 'noci',
  nights5: 'nocí',
  stops: 'zastávok',
  stops1: 'zastávka',
  stops2: 'zastávky',
  reset: 'Začať odznova',
  resetConfirm: 'Naozaj vymazať celú cestu a začať odznova?',
  theme: 'Vzhľad',
  themeLight: 'Svetlý',
  themeDark: 'Tmavý',
  themeSystem: 'Podľa systému',
  back: 'Späť',
  next: 'Ďalej',
  prevMonth: 'Predchádzajúci mesiac',
  nextMonth: 'Nasledujúci mesiac',
  monday: 'Po', tuesday: 'Ut', wednesday: 'St', thursday: 'Št', friday: 'Pi', saturday: 'So', sunday: 'Ne',
}

type Dict = typeof SK

const EN: Dict = {
  appName: 'Packed?',
  appTagline: 'A packing planner for active, multi-stop trips with one backpack.',
  heroEyebrow: 'Smart packing list',
  heroTitle: 'Pack once. For the whole trip.',
  heroCopy:
    'Build your route from stops, tell us what you will be doing and which bag it must fit into. AI handles the rest.',

  stepRoute: 'Route',
  stepYou: 'You & pace',
  stepBags: 'Luggage',
  stepList: 'Packing list',
  stepRouteHint: 'Stops, dates and activities',
  stepYouHint: 'Who we are packing for',
  stepBagsHint: 'What it has to fit into',
  stepListHint: 'Finished list with AI',

  legs: 'Trip stops',
  legsHint: 'Add every place you sleep. With several stops we plan for the transfers too.',
  leg: 'Stop',
  addLeg: 'Add stop',
  removeLeg: 'Remove stop',
  legNotes: 'Note for this stop (optional)',
  legNotesPlaceholder: 'e.g. we want two days for the Path of the Gods…',
  activities: 'What will you be doing there?',
  activitiesHint: '(pick everything that applies — it drives the gear)',
  destination: 'Destination',
  destinationPlaceholder: 'Where to? e.g. Amalfi, High Tatras, Tirana…',
  transport: 'How do you get there?',
  accommodation: 'Where do you sleep?',
  dateFrom: 'From',
  dateTo: 'To',
  pickDate: 'Pick a date',
  pickDepart: 'Pick arrival date',
  pickReturn: 'Pick departure date',
  done: 'Done',

  packFor: 'Packing for',
  genderWoman: 'A woman',
  genderMan: 'A man',
  genderUnspecified: 'Prefer not to say',
  pace: 'Trip pace',
  pacePokojne: 'Relaxed',
  paceStredne: 'Balanced',
  paceNabite: 'Packed',
  pacePokojneHint: 'Lots of rest, few transfers',
  paceStredneHint: 'Activity and rest alternating',
  paceNabiteHint: 'Something every day, little downtime',
  laundry: 'I will do laundry on the trip',
  laundryHint: 'Cuts clothing counts hard — the strongest one-bag trick there is',
  personalNotes: 'Anything we should know?',
  personalNotesPlaceholder: 'Allergies, meds, gear you already own, kids, special needs…',

  bags: 'Your luggage',
  bagsHint: 'Enter the exact backpack or suitcase model — AI finds the dimensions and checks cabin fit.',
  addBag: 'Add a bag',
  removeBag: 'Remove',
  bagModel: 'Bag model',
  bagModelPlaceholder: 'e.g. Osprey Farpoint 40, Samsonite Base Boost…',
  bagLookup: 'Look up specs',
  bagLitres: 'Volume (l)',
  bagWeightLimit: 'Limit (kg)',
  bagKindOsobna: 'Personal (under seat)',
  bagKindKabinova: 'Cabin',
  bagKindOdbavena: 'Checked',
  bagFitsCabin: 'Fits as cabin bag',
  bagFitsUnderSeat: 'Fits under the seat',
  bagTooBig: 'Over the cabin limit',
  flightNumber: 'Flight number (optional)',
  flightNumberPlaceholder: 'e.g. FR1234, W6 5678',
  flightSearch: 'Search',
  orPickAirline: 'Or pick an airline',
  hasPriority: 'I have Priority boarding',
  hasPriorityHint: 'Bigger cabin bag onboard + priority boarding',
  hasPaidBag: 'I paid for extra baggage',
  hasPaidBagHint: 'Records the weight limit in the list',
  airlineNotFound:
    'Airline not recognised. Check the flight number format or the carrier website.',

  capacity: 'Luggage fill',
  capacityUsed: 'used',
  capacityOf: 'of',
  capacityLitres: 'l',
  capacityWeight: 'Weight',
  capacityOverVolume: 'This will not fit — something has to go.',
  capacityOverWeight: 'You are over the weight limit — airport fees are expensive.',
  capacityTight: 'Tight, but with compression it works.',
  capacityRebalance: 'It fits overall, but one bag is overloaded — move some items across.',
  capacityOk: 'You have room to spare.',
  capacityWorn: 'worn on travel day',
  capacityAskAi: 'What to drop?',

  generate: 'Generate packing list',
  regenerate: 'Recalculate list',
  generating: 'Calculating…',
  regenerateWarn: 'A new list clears your checked items.',
  packed: 'Packed',
  of: 'of',
  allPacked: 'All packed!',
  addItem: 'Add a custom item…',
  addItemBtn: 'Add',
  removeItem: 'Remove',
  printList: 'Print',
  editTrip: 'Edit trip',
  backToList: 'Back to list',
  filterAll: 'All',
  filterTodo: 'Not packed',
  filterKey: 'Key items',
  bagFilter: 'By bag',
  bagNaSebe: 'Worn',
  qtyEdit: 'Edit quantity',
  moveTo: 'Move to',
  empty: 'Nothing yet — generate the list.',

  weatherTitle: 'Weather',
  weatherRange: 'Temperature range for the whole trip',
  weatherSpread: 'spread',
  weatherDayAvg: 'Daytime',
  weatherNight: 'At night',
  weatherNoRain: 'No rain',
  weatherRain1: 'rainy day',
  weatherRain2: 'rainy days',
  weatherRain5: 'rainy days',
  weatherEstimate: 'Estimate from last year',
  weatherLoading: 'Fetching weather',
  weatherError: 'Could not load weather — we will generate the list without it.',
  layeringWarn: 'Large temperature spread — the list is built on layering, not two wardrobes.',

  aiStatusLoading: 'AI is analysing the trip and tuning the list…',
  aiStatusDone: 'List tuned by AI',
  aiStatusError: 'AI tuning failed. The base list is still complete.',
  aiStrategy: 'Packing strategy',
  aiAsk: 'Ask AI',
  aiAskTitle: 'AI packing assistant',
  aiAskHint: 'Ask or just tell it what to do — the list updates.',
  aiAskPlaceholder: 'e.g. “Drop the second fleece, what instead?”',
  aiSend: 'Send',
  aiThinking: 'Thinking…',
  aiChanged: 'Changed',
  aiError: 'The assistant did not answer. Try again.',
  aiSuggest1: 'Will this fit in my luggage?',
  aiSuggest2: 'What can I drop?',
  aiSuggest3: 'What am I missing for a rainy day?',
  aiSuggest4: 'Cut the list to the minimum',

  dayPlan: 'Day-by-day plan',
  dayPlanHint: 'AI suggests a programme, an outfit for each day and what to put in your day bag.',
  dayPlanGenerate: 'Suggest a plan',
  dayPlanLoading: 'Building the itinerary…',
  dayPlanError: 'Could not build the itinerary.',
  dayOutfit: 'Wear',
  dayBag: 'Day bag',
  dayWatchOut: 'Watch out',
  dayPackingImplications: 'What this means for packing',
  intensityOddych: 'Easy',
  intensityStredna: 'Medium',
  intensityNarocna: 'Hard',

  destInfo: 'Destination info',
  destInfoLoading: 'AI is fetching destination info…',
  infoCurrency: 'Currency',
  infoPlug: 'Electricity',
  infoVisa: 'Entry',
  infoSafety: 'Safety',
  infoHealth: 'Health',
  infoTips: 'Local tips',
  infoEmergency: 'Emergency',
  infoBaggage: 'Baggage (AI)',
  infoNoAdapter: 'No adapter needed',

  catItinerar: 'Itinerary & transfers',
  catBatozina: 'Bags & organisation',
  catDoklady: 'Documents & money',
  catVrstvy: 'Layering system',
  catOblecenie: 'Other clothing',
  catObuv: 'Footwear',
  catTuristika: 'Hiking & outdoors',
  catPlaz: 'Water & beach',
  catMesto: 'City & evenings',
  catBicykel: 'Cycling',
  catSneh: 'Snow & winter',
  catGeocaching: 'Geocaching',
  catAuto: 'Car',
  catHygiena: 'Toiletries',
  catLekarnicka: 'First aid',
  catElektronika: 'Electronics',
  catJedlo: 'Food & drink',
  catPraca: 'Work on the road',
  catPredodchodom: 'Before departure',

  transportPlane: 'Plane',
  transportCar: 'Car',
  transportTrain: 'Train',
  transportBus: 'Bus',
  transportFerry: 'Ferry',
  transportWalk: 'On foot',
  transportOther: 'Other',
  transportOtherPlaceholder: 'Describe how — e.g. by bike…',

  accomHotel: 'Hotel',
  accomPrivat: 'Apartment',
  accomHostel: 'Hostel',
  accomKemp: 'Camping',
  accomChata: 'Mountain hut',
  accomOther: 'Other',
  accomOtherPlaceholder: 'Describe where — e.g. with friends…',

  day: 'day',
  days2: 'days',
  days5: 'days',
  night: 'night',
  nights2: 'nights',
  nights5: 'nights',
  stops: 'stops',
  stops1: 'stop',
  stops2: 'stops',
  reset: 'Start over',
  resetConfirm: 'Really delete the whole trip and start over?',
  theme: 'Appearance',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  back: 'Back',
  next: 'Next',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
}

const MONTHS_SK = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const TRANSLATIONS: Record<Lang, Dict> = { sk: SK, en: EN }

export type Translations = Dict

interface LangCtx {
  lang: Lang
  t: Dict
  monthNames: string[]
  locale: string
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({
  lang: 'sk',
  t: SK,
  monthNames: MONTHS_SK,
  locale: 'sk-SK',
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('sk')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
      if (saved === 'sk' || saved === 'en') setLangState(saved)
    } catch {
      /* private mode — stay on the default */
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <Ctx.Provider
      value={{
        lang,
        t: TRANSLATIONS[lang],
        monthNames: lang === 'en' ? MONTHS_EN : MONTHS_SK,
        locale: lang === 'en' ? 'en-GB' : 'sk-SK',
        setLang,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useLang() {
  return useContext(Ctx)
}

/** Slovak needs 1 / 2–4 / 5+ forms; English just needs a plural. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}
