import { z } from 'zod'
import { failureResponse, runStructured } from '@/lib/ai-model'
import { CATEGORY_ENUM, PACKING_PRINCIPLES, describeList, describeTrip } from '@/lib/ai-context'
import type { PackItem, TripConfig } from '@/lib/types'

export const maxDuration = 60

const AiPacklistSchema = z.object({
  reasoning: z.string().describe(
    'Po slovensky, 2–4 vety: aké hlavné rozhodnutia si urobil pre TÚTO cestu (vrstvenie, objem batožiny, presuny).',
  ),
  strategy: z.string().describe(
    'Po slovensky, jedna veta: stratégia balenia pre túto cestu, napr. "Jedno jadro merino vrstiev na 12–28 °C, turistické topánky na nohách, všetko ostatné do 40 l".',
  ),
  additions: z.array(
    z.object({
      category: z.enum(CATEGORY_ENUM),
      name: z.string().describe('Názov položky po slovensky'),
      qty: z.number().optional().describe('Počet kusov, vynechaj ak sa nepočíta'),
      note: z.string().optional().describe('Krátke vysvetlenie alebo tip po slovensky'),
      litres: z.number().describe('Odhad zabaleného objemu v litroch za kus (napr. tričko 0.7, bunda 1.2, topánky 5)'),
      grams: z.number().describe('Odhad hmotnosti v gramoch za kus'),
      bag: z.enum(['osobna', 'kabinova', 'odbavena', 'naSebe']).describe(
        'Kam to patrí. naSebe = nesie sa na tele v deň cesty a nezaberá miesto v batožine.',
      ),
      legIds: z.array(z.string()).optional().describe(
        'ID zastávok, pre ktoré je položka potrebná. Vynechaj, ak platí pre celú cestu.',
      ),
    }),
  ).describe('Nové položky, ktoré základný zoznam vynechal. Kvalita nad kvantitou — max 15.'),
  removals: z.array(z.string()).describe(
    'Presné názvy položiek zo základného zoznamu, ktoré sú pre túto cestu zbytočné alebo sa nezmestia.',
  ),
  highlights: z.array(z.string()).describe(
    'Presné názvy 4–7 najdôležitejších položiek pre túto cestu.',
  ),
  weatherNote: z.string().optional().describe(
    'Jedna veta po slovensky o tom, čo znamená predpoveď pre balenie.',
  ),
  capacityVerdict: z.object({
    verdict: z.enum(['ok', 'tesne', 'nezmesti']).describe('Či sa zoznam zmestí do batožiny'),
    advice: z.string().describe('Po slovensky, 1–2 vety: čo konkrétne uberať alebo ako to natlačiť.'),
  }),
})

export type AiPacklistResult = z.infer<typeof AiPacklistSchema>

interface Body {
  cfg: TripConfig
  items: PackItem[]
}

function buildPrompt({ cfg, items }: Body): string {
  const legIds = cfg.legs
    .filter((l) => l.destination)
    .map((l) => `${l.id} = ${l.destination?.name}`)
    .join(', ')

  return `Si expert na balenie na aktívne cesty s presunmi a obmedzenou batožinou. Dostávaš už vygenerovaný základný zoznam a tvojou úlohou je ho DOLADIŤ pre túto konkrétnu cestu.

${describeTrip(cfg)}

ID ZASTÁVOK: ${legIds || 'žiadne'}

${describeList(items, cfg)}

${PACKING_PRINCIPLES}

ČO OD TEBA CHCEM:
• "additions" — čo v zozname chýba práve pre TÚTO cestu. Zameraj sa na: špecifiká destinácie a terénu, konkrétne aktivity, veci potrebné pri presunoch medzi zastávkami, požiadavky krajiny (redukcia, hotovosť, vakcíny, dress code), sezónne riziká. Ku každej položke povinne uveď litre aj gramy, nech sa dá prepočítať objem.
• "removals" — čo je v zozname zbytočné. Buď prísny, ak je batožina malá: pri objeme do 45 l musíš niečo vyhodiť.
• "highlights" — položky, na ktorých táto cesta stojí alebo padá.
• "capacityVerdict" — porovnaj súčet objemu so skutočnou kapacitou batožiny a povedz pravdu. Ak sa to nezmestí, napíš KTORÉ konkrétne položky obetovať.

Nevymýšľaj letecké pravidlá, ak sa neletí. Nepridávaj kempingové veci, ak sa nekempuje. Všetko píš po SLOVENSKY.`
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    if (!body?.cfg?.legs?.length) {
      return Response.json({ error: 'Missing trip config' }, { status: 400 })
    }

    const result = await runStructured('ai-packlist', {
      schema: AiPacklistSchema,
      prompt: buildPrompt(body),
      temperature: 0.4,
    })

    if (!result.ok) return failureResponse(result.failure)
    return Response.json(result.object)
  } catch (err) {
    console.error('[ai-packlist]', err)
    return Response.json({ error: 'Bad request', reason: 'other' }, { status: 500 })
  }
}
