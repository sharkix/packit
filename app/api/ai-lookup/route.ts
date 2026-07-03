import { generateObject } from 'ai'
import { gateway } from 'ai'
import { z } from 'zod'

const CountryInfoSchema = z.object({
  currency: z.string().describe('Mena krajiny, napr. "Euro (EUR)"'),
  currencySymbol: z.string().describe('Symbol meny, napr. "€"'),
  cashTip: z.string().describe(
    'Praktická rada k plateniu — kde platia karty, kde treba hotovosť, koľko vziať'
  ),
  plugAdapter: z.object({
    type: z.string().describe('Typ zástrčky, napr. "Typ C / F (Europlug)"'),
    voltage: z.string().describe('Napätie, napr. "230V"'),
    frequency: z.string().describe('Frekvencia, napr. "50Hz"'),
    needsAdapter: z.boolean().describe('Či obyvateľ SR potrebuje redukciu'),
    adapterNote: z.string().optional().describe('Ak treba redukciu, stručný popis; inak vynechaj'),
  }),
  visaNote: z.string().describe(
    'Stručná informácia o vízach pre slovenského cestovateľa — či treba, ako získať, e-visa, bezcolná zóna atď.'
  ),
  safetyNote: z.string().optional().describe(
    'Ak je bezpečnostná situácia relevantná (napr. kapesníci, podvody turistov, nebezpečné oblasti), stručná rada'
  ),
  healthTips: z.array(z.string()).optional().describe(
    'Zdravotné tipy — odporúčané vakcíny, pitná voda, zdravotná poisťovňa, sun/heat riziká'
  ),
  localTips: z.array(z.string()).optional().describe(
    'Kultúrne a praktické tipy — zvyky, dress code, zálohy, zákon o fotografovaní, šoférovanie, atď.'
  ),
  emergencyNumber: z.string().optional().describe(
    'Tiesňové číslo v krajine, ak sa líši od 112'
  ),
  baggageInfo: z.object({
    airline: z.string().optional(),
    cabinSize: z.string().optional().describe('Rozmery kabínovej batožiny, napr. "55×40×20 cm"'),
    cabinWeightKg: z.number().optional(),
    checkedWeightKg: z.number().optional(),
    priorityNote: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']).describe(
      'high = overené pravidlá z 2024/2025, medium = pravdepodobné, low = odhadom'
    ),
  }).optional().describe(
    'Vyplň len ak flightIata alebo flightNumber je uvedené — batožinové pravidlá konkrétnej aerolínie'
  ),
})

export type AiLookupResult = z.infer<typeof CountryInfoSchema>

interface LookupRequest {
  countryCode?: string
  country?: string
  destination?: string
  flightIata?: string      // e.g. "FR", "W6"
  flightNumber?: string    // e.g. "FR1234"
  hasPriority?: boolean
  hasPaidBag?: boolean
  luggageType?: string
  luggagePieces?: string[]  // e.g. ['osobna', 'kabinova', 'odbavena']
  lang?: 'sk' | 'en'
}

const PIECE_LABELS: Record<string, string> = {
  osobna: 'osobná batožina (malý ruksak)',
  kabinova: 'kabínová batožina (kufrík)',
  odbavena: 'odbavený kufor',
}

function buildPrompt(req: LookupRequest): string {
  const dest = [req.destination, req.country].filter(Boolean).join(', ')
  const flightLine = req.flightIata
    ? `Číslo letu / IATA aerolínie: ${req.flightNumber ?? req.flightIata} (${req.flightIata})${req.hasPriority ? ', má Priority boarding' : ''}${req.hasPaidBag ? ', zaplatená väčšia batožina' : ''}`
    : req.flightNumber
      ? `Zadané číslo letu: ${req.flightNumber} — urči aerolíniu a jej pravidlá batožiny`
      : 'Let je bez zadaného čísla — baggageInfo vynechaj'

  return `Si cestovný expert. Pre slovenského cestovateľa letiacého do "${dest}" (kód krajiny: ${req.countryCode ?? '?'}) zisti nasledovné informácie.

LET: ${flightLine}
BATOŽINA: ${req.luggagePieces?.length ? req.luggagePieces.map((p) => PIECE_LABELS[p] ?? p).join(' + ') : req.luggageType ?? 'neuvedená'}

Odpovedz presne a stručne. Všetky texty píš po SLOVENSKY (okrem názvov, kódov, rozmerov).

Dôležité pravidlá:
- needsAdapter: true iba ak slovenská zástrčka (230V, Typ C/F) NEPASUJE — čo je veľmi málo krajín mimo EU
- cashTip: konkrétna rada (napr. "Na trhy a taxi treba hotovosť, karty sú bežné v reštauráciách")
- healthTips: iba relevantné (tropické krajiny = vakcíny, EU = EHIC karta stačí)
- localTips: max 4 praktické tipy, nie turistické klišé
- baggageInfo: vyplň len ak je let zadaný, uveď aktuálne pravidlá z 2024-2025`
}

export async function POST(req: Request) {
  try {
    const body: LookupRequest = await req.json()

    const { object } = await generateObject({
      model: gateway('anthropic/claude-sonnet-5'),
      schema: CountryInfoSchema,
      prompt: buildPrompt(body),
      temperature: 0.2,
    })

    return Response.json(object)
  } catch (err) {
    console.error('[ai-lookup]', err)
    return Response.json({ error: 'AI lookup failed' }, { status: 500 })
  }
}
