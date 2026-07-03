import type { FlightInfo } from './types'

// ── Airline baggage rules database ────────────────────────────────────────────
// IATA prefix → known baggage policy
// Sources: official airline websites (2024–2025)
const AIRLINE_RULES: Record<
  string,
  {
    name: string
    cabinBagSize: string
    cabinBagWeight?: number
    /** Weight included in base fare */
    checkedIncluded?: number
    /** Default paid hold-bag weight */
    checkedPaidDefault?: number
    priorityNote: string
  }
> = {
  FR: {
    name: 'Ryanair',
    cabinBagSize: '40×20×25 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 20,
    priorityNote: 'Priority: kabínová batožina 55×40×20 cm + malý batoh do sedadla',
  },
  W6: {
    name: 'Wizz Air',
    cabinBagSize: '40×30×20 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 23,
    priorityNote: 'WIZZ Priority: kabínový kufrík 55×40×23 cm zdarma do kabíny',
  },
  VY: {
    name: 'Vueling',
    cabinBagSize: '40×20×25 cm',
    checkedPaidDefault: 23,
    priorityNote: 'Optima tarif: kabínový kufrík 55×40×20 cm do kabíny',
  },
  U2: {
    name: 'easyJet',
    cabinBagSize: '45×36×20 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 23,
    priorityNote: 'Speedy Boarding: kabínový kufrík 56×45×25 cm do kabíny',
  },
  OK: {
    name: 'Czech Airlines',
    cabinBagSize: '55×45×25 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Palubná batožina zahrnutá, odbavená v cene letenky',
  },
  LO: {
    name: 'LOT Polish Airlines',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Ekonomická trieda: 1× 23 kg odbavená batožina v cene',
  },
  LH: {
    name: 'Lufthansa',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  OS: {
    name: 'Austrian Airlines',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  SK: {
    name: 'SAS',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Go tarif: 1× 23 kg v cene',
  },
  BA: {
    name: 'British Airways',
    cabinBagSize: '56×45×25 cm',
    cabinBagWeight: undefined,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  KL: {
    name: 'KLM',
    cabinBagSize: '55×35×25 cm',
    cabinBagWeight: 12,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  AF: {
    name: 'Air France',
    cabinBagSize: '55×35×25 cm',
    cabinBagWeight: 12,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  TK: {
    name: 'Turkish Airlines',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene letenky',
  },
  IB: {
    name: 'Iberia',
    cabinBagSize: '56×36×23 cm',
    cabinBagWeight: 10,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy Basic: batožina za príplatok',
  },
  AZ: {
    name: 'ITA Airways',
    cabinBagSize: '55×35×25 cm',
    cabinBagWeight: 8,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Economy: 1× 23 kg v cene',
  },
  EW: {
    name: 'Eurowings',
    cabinBagSize: '55×40×23 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 23,
    priorityNote: 'Smart tarif: kabína zahrnutá',
  },
  HV: {
    name: 'Transavia',
    cabinBagSize: '55×35×25 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 20,
    priorityNote: 'Basic: kabínový kufrík za príplatok',
  },
  TP: {
    name: 'TAP Air Portugal',
    cabinBagSize: '55×40×20 cm',
    cabinBagWeight: 10,
    checkedIncluded: 23,
    checkedPaidDefault: 23,
    priorityNote: 'Discount tarif: bez odbavenej batožiny',
  },
  BT: {
    name: 'airBaltic',
    cabinBagSize: '55×40×20 cm',
    cabinBagWeight: undefined,
    checkedPaidDefault: 23,
    priorityNote: 'Business: kabína v cene, economy za príplatok',
  },
  QR: {
    name: 'Qatar Airways',
    cabinBagSize: '50×37×25 cm',
    cabinBagWeight: 7,
    checkedIncluded: 30,
    checkedPaidDefault: 30,
    priorityNote: 'Economy: 30 kg v cene',
  },
  EK: {
    name: 'Emirates',
    cabinBagSize: '55×38×20 cm',
    cabinBagWeight: 7,
    checkedIncluded: 35,
    checkedPaidDefault: 35,
    priorityNote: 'Economy: 35 kg v cene',
  },
}

// Normalize flight number: "ryanair 123" / "FR 1234" / "fr1234" → "FR"
function extractIata(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '')
  // Match leading 2–3 letter IATA code
  const match = cleaned.match(/^([A-Z]{2,3})\d/)
  return match ? match[1] : null
}

export function lookupFlightBaggage(
  flightNumber: string,
  hasPriority: boolean,
  hasPaidBag: boolean,
): FlightInfo | null {
  const iata = extractIata(flightNumber)
  if (!iata) return null

  const rule = AIRLINE_RULES[iata]
  if (!rule) return null

  const info: FlightInfo = {
    flightNumber: flightNumber.trim().toUpperCase(),
    airline: rule.name,
    iata,
    cabinBagSize: hasPriority ? (PRIORITY_SIZE[iata] ?? rule.cabinBagSize) : rule.cabinBagSize,
    cabinBagWeight: rule.cabinBagWeight,
    checkedBagWeight: hasPaidBag
      ? (rule.checkedPaidDefault ?? 23)
      : rule.checkedIncluded,
    priorityBoardingNote: hasPriority ? rule.priorityNote : undefined,
    source: 'known',
  }

  return info
}

// Priority cabin bag sizes differ from basic for LCC
const PRIORITY_SIZE: Record<string, string> = {
  FR: '55×40×20 cm',
  W6: '55×40×23 cm',
  VY: '55×40×20 cm',
  U2: '56×45×25 cm',
  EW: '55×40×23 cm',
  HV: '55×35×25 cm',
}

// Suggestions for autocomplete — top 10 airlines used from Slovakia
export const POPULAR_AIRLINES = [
  { iata: 'FR', name: 'Ryanair' },
  { iata: 'W6', name: 'Wizz Air' },
  { iata: 'OK', name: 'Czech Airlines' },
  { iata: 'LO', name: 'LOT Polish Airlines' },
  { iata: 'LH', name: 'Lufthansa' },
  { iata: 'OS', name: 'Austrian Airlines' },
  { iata: 'U2', name: 'easyJet' },
  { iata: 'VY', name: 'Vueling' },
  { iata: 'TK', name: 'Turkish Airlines' },
  { iata: 'KL', name: 'KLM' },
]
