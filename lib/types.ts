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
}

export interface PackItem {
  id: string
  category: string
  name: string
  qty?: number
  note?: string
  checked: boolean
  custom?: boolean
}
