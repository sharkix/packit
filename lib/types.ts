// ── Geo ───────────────────────────────────────────────────────────────────────

export interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  country?: string
  country_code?: string
  admin1?: string
}

// ── Activities ────────────────────────────────────────────────────────────────
// An active trip is described by what you DO, not by a single "trip type".
// Every activity contributes its own gear, and the union across all legs is
// deduplicated by the packing engine.

export type ActivityKind =
  | 'hiking'      // turistika, treking
  | 'city'        // mesto, kultúra, kaviarne
  | 'beach'       // more, kúpanie
  | 'boat'        // lode, trajekty, kajak
  | 'bike'        // bicykel, e-bike
  | 'running'     // beh
  | 'climbing'    // ferraty, lezenie
  | 'snow'        // lyže, snowboard, zimné hory
  | 'nightlife'   // reštaurácie, bary, dress code
  | 'photo'       // fotenie, východy/západy slnka
  | 'geocaching'  // kešky
  | 'roadtrip'    // auto / presuny
  | 'wellness'    // kúpele, sauna, bazén
  | 'work'        // práca na ceste

export type Gender = 'muz' | 'zena' | 'neuvedene'
export type TransportMode = 'lietadlo' | 'auto' | 'vlak' | 'autobus' | 'trajekt' | 'peso' | 'ine'
export type Accommodation = 'hotel' | 'privat' | 'hostel' | 'kemp' | 'chata' | 'ine'
export type Pace = 'pokojne' | 'stredne' | 'nabite'

// ── Luggage ───────────────────────────────────────────────────────────────────

export type LuggagePiece = 'osobna' | 'kabinova' | 'odbavena'

/** One physical bag the traveller actually owns / plans to carry. */
export interface BagSpec {
  id: string
  kind: LuggagePiece
  /** Free-text model, e.g. "Osprey Farpoint 40" — resolved by AI when possible */
  model?: string
  litres: number
  /** "54×36×23 cm" */
  dimensions?: string
  /** Empty weight of the bag itself, kg */
  emptyWeightKg?: number
  /** Airline / self-imposed max total weight, kg */
  maxWeightKg?: number
  /** Filled by the AI bag lookup */
  aiResolved?: boolean
  confidence?: 'high' | 'medium' | 'low'
  /** AI note, e.g. "Prejde ako kabínová u Ryanair len bez napchatia predného vrecka" */
  note?: string
  fitsCabin?: boolean
}

export interface FlightInfo {
  flightNumber: string
  airline: string
  iata: string
  cabinBagSize: string
  cabinBagWeight?: number
  personalItemSize?: string
  checkedBagWeight?: number
  priorityBoardingNote?: string
  source: 'api' | 'manual' | 'known'
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface DailyWeather {
  date: string
  tMax: number
  tMin: number
  precipProb: number
  code: number
  windMax?: number
}

export interface WeatherSummary {
  days: DailyWeather[]
  avgMax: number
  avgMin: number
  maxT: number
  minT: number
  rainyDays: number
  isEstimate: boolean
  hot: boolean
  warm: boolean
  cold: boolean
  freezing: boolean
  rainy: boolean
  windy: boolean
}

/** Temperature spread across the WHOLE trip — drives the layering system. */
export interface ClimateRange {
  minT: number
  maxT: number
  /** max - min across all legs; > 15 °C means a real layering problem */
  spread: number
  rainyDays: number
  totalDays: number
  hasFreezing: boolean
  hasHot: boolean
  isEstimate: boolean
}

// ── Itinerary ─────────────────────────────────────────────────────────────────

/** One stop of the trip. An active trip is a sequence of these. */
export interface TripLeg {
  id: string
  destination: GeoResult | null
  startDate: string
  endDate: string
  /** How you travel TO this leg */
  transport: TransportMode
  transportOther?: string
  accommodation: Accommodation
  accommodationOther?: string
  activities: ActivityKind[]
  notes?: string
  /** Fetched client-side and cached on the leg */
  weather?: WeatherSummary | null
}

export interface TripConfig {
  legs: TripLeg[]
  gender: Gender
  pace: Pace
  /** Traveller can do laundry mid-trip — massively cuts clothing counts */
  laundry: boolean
  bags: BagSpec[]
  flightNumber?: string
  flightInfo?: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  countryInfos?: Record<string, CountryInfo>
  /** Free-text: allergies, meds, kids, gear already owned… */
  personalNotes?: string
}

// ── Destination intel ─────────────────────────────────────────────────────────

export interface PlugAdapter {
  type: string
  voltage: string
  frequency: string
  needsAdapter: boolean
  adapterNote?: string
}

export interface CountryInfo {
  country: string
  currency: string
  currencySymbol: string
  cashTip: string
  plugAdapter: PlugAdapter
  visaNote: string
  safetyNote?: string
  healthTips?: string[]
  localTips?: string[]
  emergencyNumber?: string
  baggageInfo?: {
    airline?: string
    cabinSize?: string
    cabinWeightKg?: number
    checkedWeightKg?: number
    priorityNote?: string
    confidence: 'high' | 'medium' | 'low'
  }
}

// ── Packing list ──────────────────────────────────────────────────────────────

/** Where an item lives while travelling — drives the airport/security checklist. */
export type BagAssignment = 'osobna' | 'kabinova' | 'odbavena' | 'naSebe'

export interface PackItem {
  id: string
  category: string
  name: string
  qty?: number
  note?: string
  checked: boolean
  custom?: boolean
  aiAdded?: boolean
  highlight?: boolean
  /** Estimated packed volume in litres (per unit) — powers the capacity meter */
  litres?: number
  /** Estimated weight in grams (per unit) */
  grams?: number
  /** Which bag it goes in; 'naSebe' = worn on travel day (costs no luggage space) */
  bag?: BagAssignment
  /** Which legs need it — empty/undefined means "the whole trip" */
  legIds?: string[]
  /** Part of the layering system: base / mid / shell */
  layer?: 'base' | 'mid' | 'shell'
}

export interface CapacityReport {
  /** litres actually needed, excluding worn-on-body items */
  usedLitres: number
  availableLitres: number
  fillPct: number
  usedKg: number
  /** Weight sitting in bags that actually have a limit — the only fair
   *  comparison against maxKg. */
  limitedKg: number
  maxKg: number | null
  overVolume: boolean
  overWeight: boolean
  /** Total fits, but at least one individual bag is over its own limit */
  anyBagOver: boolean
  perBag: {
    bag: BagSpec
    usedLitres: number
    fillPct: number
    usedKg: number
    over: boolean
  }[]
}

// ── AI assistant ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Short summary of what the assistant changed, shown as chips */
  changes?: string[]
}
