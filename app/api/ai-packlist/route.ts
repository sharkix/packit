import { z } from 'zod'
import { failureResponse, runStructured } from '@/lib/ai-model'
import { CATEGORY_ENUM, PACKING_PRINCIPLES, describeList, describeTrip } from '@/lib/ai-context'
import type { PackItem, TripConfig } from '@/lib/types'

export const maxDuration = 300

const AiPacklistSchema = z.object({
  reasoning: z.string().describe(
    'Po slovensky, MAX 2 vety: hlavné rozhodnutie pre túto cestu.',
  ),
  strategy: z.string().describe(
    'Po slovensky, jedna veta: stratégia balenia pre túto cestu, napr. "Jedno jadro merino vrstiev na 12–28 °C, turistické topánky na nohách, všetko ostatné do 40 l".',
  ),
  additions: z.array(
    z.object({
      category: z.enum(CATEGORY_ENUM),
      name: z.string().describe('Názov položky po slovensky'),
      qty: z.number().optional().describe('Počet kusov, vynechaj ak sa nepočíta'),
      note: z.string().optional().describe('Max 8 slov po slovensky, alebo vynechaj'),
      litres: z.number().describe('Odhad zabaleného objemu v litroch za kus (napr. tričko 0.7, bunda 1.2, topánky 5)'),
      grams: z.number().describe('Odhad hmotnosti v gramoch za kus'),
      bag: z.enum(['osobna', 'kabinova', 'odbavena', 'naSebe']).describe(
        'Kam to patrí. naSebe = nesie sa na tele v deň cesty a nezaberá miesto v batožine.',
      ),
    }),
  ).max(8).describe('Nové položky, ktoré základný zoznam vynechal. NAJVIAC 8, kvalita nad kvantitou.'),
  removals: z.array(z.string()).max(10).describe(
    'Presné názvy položiek zo základného zoznamu, ktoré sú zbytočné. Najviac 10.',
  ),
  highlights: z.array(z.string()).max(6).describe(
    'Presné názvy najdôležitejších položiek. Najviac 6.',
  ),
  weatherNote: z.string().optional().describe(
    'Jedna veta po slovensky o tom, čo znamená predpoveď pre balenie.',
  ),
  capacityVerdict: z.object({
    verdict: z.enum(['ok', 'tesne', 'nezmesti']).describe('Či sa zoznam zmestí do batožiny'),
    advice: z.string().describe('Po slovensky, MAX 2 vety: čo konkrétne uberať.'),
  }),
})

export type AiPacklistResult = z.infer<typeof AiPacklistSchema>

interface Body {
  cfg: TripConfig
  items: PackItem[]
}

function buildPrompt({ cfg, items }: Body): string {
  return `Si expert na balenie na aktívne cesty s presunmi a obmedzenou batožinou. Dostávaš už vygenerovaný základný zoznam a tvojou úlohou je ho DOLADIŤ pre túto konkrétnu cestu.

${describeTrip(cfg)}

${describeList(items, cfg)}

${PACKING_PRINCIPLES}

ČO OD TEBA CHCEM:
• "additions" — NAJVIAC 8 vecí, ktoré v zozname chýbajú práve pre TÚTO cestu. Zameraj sa na: špecifiká destinácie a terénu, konkrétne aktivity, veci potrebné pri presunoch medzi zastávkami, požiadavky krajiny (redukcia, hotovosť, vakcíny, dress code), sezónne riziká. Ku každej položke povinne uveď litre aj gramy, nech sa dá prepočítať objem.
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
