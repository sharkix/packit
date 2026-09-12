import { z } from 'zod'
import { failureResponse, runStructured } from '@/lib/ai-model'

export const maxDuration = 30

const BagSchema = z.object({
  recognised: z.boolean().describe('Či sa podarilo model batožiny identifikovať'),
  model: z.string().describe('Oficiálny názov modelu, napr. "Osprey Farpoint 40"'),
  brand: z.string().optional(),
  litres: z.number().describe('Objem v litroch'),
  dimensions: z.string().describe('Vonkajšie rozmery v tvare "54×36×23 cm"'),
  emptyWeightKg: z.number().describe('Hmotnosť prázdneho batohu/kufra v kg'),
  kind: z.enum(['osobna', 'kabinova', 'odbavena']).describe(
    'Do ktorej kategórie batožiny typicky patrí: osobna = pod sedadlo, kabinova = do priestoru nad hlavou, odbavena = do podpalubia',
  ),
  fitsCabin: z.boolean().describe('Či prejde ako kabínová batožina u bežných európskych aerolínií'),
  fitsUnderSeat: z.boolean().describe('Či prejde ako malá osobná batožina pod sedadlo (cca 40×20×25 cm)'),
  note: z.string().describe(
    'Po slovensky, 1–2 vety: praktická poznámka k rozmerom — či prejde u nízkonákladoviek, či sa dá stiahnuť popruhmi, na čo si dať pozor.',
  ),
  packingTips: z.array(z.string()).describe(
    'Po slovensky, 2–4 konkrétne tipy na balenie práve do tohto typu batožiny (otváranie, vrecká, kompresia).',
  ),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type AiBagResult = z.infer<typeof BagSchema>

interface Body {
  query: string
  airline?: string
  cabinLimit?: string
  personalItemLimit?: string
  lang?: 'sk' | 'en'
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const query = (body.query ?? '').trim()
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 })

    const limits = [
      body.airline ? `Letecká spoločnosť: ${body.airline}` : null,
      body.cabinLimit ? `Limit kabínovej batožiny: ${body.cabinLimit}` : null,
      body.personalItemLimit ? `Limit osobnej batožiny: ${body.personalItemLimit}` : null,
    ].filter(Boolean).join('\n')

    const result = await runStructured('ai-bag', {
      schema: BagSchema,
      temperature: 0.1,
      prompt: `Si expert na cestovnú batožinu. Používateľ zadal model batožiny: "${query}".

${limits || 'Konkrétna letecká spoločnosť nie je zadaná — posudzuj podľa bežných európskych limitov (kabína 55×40×20 cm, osobná 40×20×25 cm).'}

Zisti skutočné parametre tohto modelu (objem, rozmery, hmotnosť) podľa oficiálnych údajov výrobcu. Ak model nepoznáš, nastav recognised=false, confidence="low" a odhadni typické hodnoty pre podobnú batožinu — v "note" to priznaj.

Pri "fitsCabin" a "fitsUnderSeat" porovnaj REÁLNE rozmery s limitom vyššie a buď konkrétny. Ak je batoh tesne cez limit, napíš to v note.

Všetky texty píš po SLOVENSKY (okrem názvu modelu a značky).`,
    })

    if (!result.ok) return failureResponse(result.failure)
    return Response.json(result.object)
  } catch (err) {
    console.error('[ai-bag]', err)
    return Response.json({ error: 'Bad request', reason: 'other' }, { status: 500 })
  }
}
