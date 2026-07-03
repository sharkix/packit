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

export type TripType = 'more' | 'hory' | 'mesto'
export type Gender = 'muz' | 'zena' | 'neuvedene'
export type LuggageType = 'ruksak' | 'ruksak+kabinka' | 'kufor-maly' | 'kufor-velky'
// Multi-select luggage pieces — any combination is allowed
export type LuggagePiece = 'osobna' | 'kabinova' | 'odbavena'
export type TransportMode = 'lietadlo' | 'auto' | 'vlak' | 'autobus' | 'ine'
export type Accommodation = 'hotel' | 'privat' | 'kemp' | 'ine'

export interface FlightInfo {
  flightNumber: string          // e.g. "FR1234"
  airline: string               // e.g. "Ryanair"
  iata: string                  // e.g. "FR"
  cabinBagSize: string          // e.g. "40×20×25 cm"
  cabinBagWeight?: number       // kg
  checkedBagWeight?: number     // kg, if paid
  priorityBoardingNote?: string
  source: 'api' | 'manual' | 'known'
}

export interface DailyWeather {
  date: string
  tMax: number
  tMin: number
  precipProb: number
  code: number
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
}

export interface TripConfig {
  destination: GeoResult
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  gender: Gender
  tripTypes: TripType[]
  weather: WeatherSummary | null
  carRental: boolean
  geocaching: boolean
  optionalTrip: boolean
  luggageType: LuggageType      // legacy single-select (kept for migration)
  luggagePieces?: LuggagePiece[] // preferred: any combination of pieces
  flightNumber?: string
  flightInfo?: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
  countryInfo?: CountryInfo | null
  transport: TransportMode
  transportOther?: string     // manual description when transport === 'ine'
  accommodation: Accommodation
  accommodationOther?: string // manual description when accommodation === 'ine'
}

export interface PlugAdapter {
  type: string        // e.g. "Typ C", "Typ F"
  voltage: string     // e.g. "230V"
  frequency: string   // e.g. "50Hz"
  needsAdapter: boolean
  adapterNote?: string
}

export interface CountryInfo {
  currency: string            // e.g. "Euro (EUR)"
  currencySymbol: string      // e.g. "€"
  cashTip: string             // e.g. "Karty sú bežné, hotovosť stačí na trhy"
  plugAdapter: PlugAdapter
  visaNote: string            // e.g. "Slovensko: bez víz (Schengen)"
  safetyNote?: string
  healthTips?: string[]       // e.g. ["Doporučená vakcína hepatitídy A"]
  localTips?: string[]        // e.g. ["Záloha na fľaše", "Pitná voda z vodovodu"]
  emergencyNumber?: string    // e.g. "112"
  baggageInfo?: {             // AI-resolved airline baggage when number unknown
    airline?: string
    cabinSize?: string
    cabinWeightKg?: number
    checkedWeightKg?: number
    priorityNote?: string
    confidence: 'high' | 'medium' | 'low'
  }
}

export interface PackItem {
  id: string
  category: string
  name: string
  qty?: number
  note?: string
  checked: boolean
  custom?: boolean
  aiAdded?: boolean    // added by AI personalisation
  highlight?: boolean  // flagged as especially important by AI
}
