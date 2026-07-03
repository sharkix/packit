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
  luggageType: LuggageType
  flightNumber?: string
  flightInfo?: FlightInfo | null
  hasPriority: boolean
  hasPaidBag: boolean
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
