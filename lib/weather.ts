import type { DailyWeather, GeoResult, WeatherSummary } from './types'

export async function searchDestinations(query: string, lang = 'sk'): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query,
  )}&count=6&language=${lang}&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  return (data.results ?? []) as GeoResult[]
}

function diffDaysFromToday(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function shiftYear(dateStr: string, years: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export async function fetchWeather(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<WeatherSummary> {
  const endOffset = diffDaysFromToday(endDate)
  const startOffset = diffDaysFromToday(startDate)

  let days: DailyWeather[] = []
  let isEstimate = false

  if (startOffset >= 0 && endOffset <= 15) {
    // Within forecast range
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&start_date=${startDate}&end_date=${endDate}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Forecast failed')
    const data = await res.json()
    const d = data.daily
    days = (d.time as string[]).map((date, i) => ({
      date,
      tMax: d.temperature_2m_max[i],
      tMin: d.temperature_2m_min[i],
      precipProb: d.precipitation_probability_max?.[i] ?? 0,
      code: d.weather_code?.[i] ?? 0,
    }))
  } else {
    // Too far in the future — use historical data from last year as an estimate
    isEstimate = true
    const histStart = shiftYear(startDate, -1)
    const histEnd = shiftYear(endDate, -1)
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&start_date=${histStart}&end_date=${histEnd}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Archive failed')
    const data = await res.json()
    const d = data.daily
    days = (d.time as string[]).map((date, i) => ({
      date: shiftYear(date, 1),
      tMax: d.temperature_2m_max[i],
      tMin: d.temperature_2m_min[i],
      precipProb: (d.precipitation_sum?.[i] ?? 0) > 1 ? 70 : 10,
      code: d.weather_code?.[i] ?? 0,
    }))
  }

  const valid = days.filter((d) => d.tMax != null && d.tMin != null)
  if (valid.length === 0) throw new Error('No weather data')

  const avgMax = valid.reduce((s, d) => s + d.tMax, 0) / valid.length
  const avgMin = valid.reduce((s, d) => s + d.tMin, 0) / valid.length
  const maxT = Math.max(...valid.map((d) => d.tMax))
  const minT = Math.min(...valid.map((d) => d.tMin))
  const rainyDays = valid.filter((d) => d.precipProb >= 50).length

  return {
    days: valid,
    avgMax,
    avgMin,
    maxT,
    minT,
    rainyDays,
    isEstimate,
    hot: avgMax >= 25,
    warm: avgMax >= 18 && avgMax < 25,
    cold: avgMax < 10,
    freezing: minT <= 0,
    rainy: rainyDays >= Math.max(1, Math.ceil(valid.length * 0.3)),
  }
}

export function weatherCodeInfo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Jasno', icon: 'sun' }
  if (code <= 2) return { label: 'Polojasno', icon: 'sun-cloud' }
  if (code === 3) return { label: 'Zamračené', icon: 'cloud' }
  if (code <= 48) return { label: 'Hmla', icon: 'fog' }
  if (code <= 57) return { label: 'Mrholenie', icon: 'drizzle' }
  if (code <= 67) return { label: 'Dážď', icon: 'rain' }
  if (code <= 77) return { label: 'Sneženie', icon: 'snow' }
  if (code <= 82) return { label: 'Prehánky', icon: 'rain' }
  if (code <= 86) return { label: 'Snehové prehánky', icon: 'snow' }
  return { label: 'Búrky', icon: 'storm' }
}
