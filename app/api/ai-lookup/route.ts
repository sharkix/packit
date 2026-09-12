import { z } from 'zod'
import { failureResponse, runStructured } from '@/lib/ai-model'

export const maxDuration = 30

const CountryInfoSchema = z.object({
  country: z.string().describe('Názov krajiny po slovensky'),
  currency: z.string().describe('Mena krajiny, napr. "Euro (EUR)"'),
  currencySymbol: z.string().describe('Symbol meny, napr. "€"'),
  cashTip: z.string().describe(
    'Praktická rada k plateniu — kde platia karty, kde treba hotovosť, koľko vziať',
  ),
  plugAdapter: z.object({
    type: z.string().describe('Typ zástrčky, napr. "Typ C / F (Europlug)"'),
    voltage: z.string().describe('Napätie, napr. "230V"'),
    frequency: z.string().describe('Frekvencia, napr. "50Hz"'),
    needsAdapter: z.boolean().describe('Či obyvateľ SR potrebuje redukciu'),
    adapterNote: z.string().optional().describe('Ak treba redukciu, stručný popis; inak vynechaj'),
  }),
  visaNote: z.string().describe(
    'Stručná informácia o vstupe pre slovenského cestovateľa — víza, e-visa, platnosť pasu, Schengen',
  ),
  safetyNote: z.string().optional().describe(
    'Ak je bezpečnostná situácia relevantná (vreckári, podvody, rizikové oblasti, horské riziká), stručná rada',
  ),
  healthTips: z.array(z.string()).optional().describe(
    'Max 3 zdravotné tipy — vakcíny, pitná voda, EPZP, riziká horúčav či výšky',
  ),
  localTips: z.array(z.string()).optional().describe(
    'Max 4 praktické a kultúrne tipy relevantné pre AKTÍVNY výlet — dress code, doprava, otváracie hodiny, správanie v prírode. Žiadne turistické klišé.',
  ),
  emergencyNumber: z.string().optional().describe('Tiesňové číslo, ak sa líši od 112'),
  baggageInfo: z.object({
    airline: z.string().optional(),
    cabinSize: z.string().optional().describe('Rozmery kabínovej batožiny, napr. "55×40×20 cm"'),
    cabinWeightKg: z.number().optional(),
    checkedWeightKg: z.number().optional(),
    priorityNote: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']),
  }).optional().describe(
    'Vyplň len ak je zadané flightIata alebo flightNumber — batožinové pravidlá konkrétnej aerolínie',
  ),
})

export type AiLookupResult = z.infer<typeof CountryInfoSchema>

interface LookupRequest {
  countryCode?: string
  country?: string
  destination?: string
  activities?: string[]
  flightIata?: string
  flightNumber?: string
  hasPriority?: boolean
  hasPaidBag?: boolean
  lang?: 'sk' | 'en'
}

function buildPrompt(req: LookupRequest): string {
  const dest = [req.destination, req.country].filter(Boolean).join(', ') || 'neuvedená destinácia'
  const flightLine = req.flightIata
    ? `Číslo letu / IATA: ${req.flightNumber ?? req.flightIata} (${req.flightIata})${req.hasPriority ? ', Priority boarding' : ''}${req.hasPaidBag ? ', zaplatená väčšia batožina' : ''}`
    : req.flightNumber
      ? `Zadané číslo letu: ${req.flightNumber} — urči aerolíniu a jej pravidlá batožiny`
      : 'Let nie je zadaný — baggageInfo vynechaj'

  return `Si cestovný expert. Pre slovenského cestovateľa mierjúceho do "${dest}" (kód krajiny: ${req.countryCode ?? '?'}) zisti nasledovné.

LET: ${flightLine}
PLÁNOVANÉ AKTIVITY: ${req.activities?.length ? req.activities.join(', ') : 'neuvedené'}

Pravidlá:
- needsAdapter: true iba ak slovenská zástrčka (230V, Typ C/F) NEPASUJE
- cashTip: konkrétne (napr. "Na chaty a vleky treba hotovosť, v mestách karty všade")
- healthTips a localTips prispôsob uvedeným aktivitám — pri turistike rieš horské riziká a značenie, pri meste vreckárov a dress code
- baggageInfo vyplň len ak je let zadaný, s pravidlami platnými v rokoch 2025–2026
- Všetky texty po SLOVENSKY (okrem názvov, kódov a rozmerov)`
}

export async function POST(req: Request) {
  try {
    const body: LookupRequest = await req.json()

    const result = await runStructured('ai-lookup', {
      schema: CountryInfoSchema,
      prompt: buildPrompt(body),
      temperature: 0.2,
    })

    if (!result.ok) return failureResponse(result.failure)
    return Response.json(result.object)
  } catch (err) {
    console.error('[ai-lookup]', err)
    return Response.json({ error: 'Bad request', reason: 'other' }, { status: 500 })
  }
}
