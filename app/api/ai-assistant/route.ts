import { z } from 'zod'
import { failureResponse, runStructured } from '@/lib/ai-model'
import { CATEGORY_ENUM, PACKING_PRINCIPLES, describeList, describeTrip } from '@/lib/ai-context'
import type { ChatMessage, PackItem, TripConfig } from '@/lib/types'

export const maxDuration = 60

const AssistantSchema = z.object({
  reply: z.string().describe(
    'Odpoveď používateľovi po slovensky. Konverzačná, konkrétna, max 5 viet. Ak si menil zoznam, stručne povedz čo a prečo.',
  ),
  add: z.array(
    z.object({
      category: z.enum(CATEGORY_ENUM),
      name: z.string(),
      qty: z.number().optional(),
      note: z.string().optional(),
      litres: z.number(),
      grams: z.number(),
      bag: z.enum(['osobna', 'kabinova', 'odbavena', 'naSebe']),
    }),
  ).describe('Položky na pridanie. Prázdne pole, ak sa nič nepridáva.'),
  remove: z.array(z.string()).describe(
    'Presné názvy položiek na odstránenie zo zoznamu. Prázdne pole, ak sa nič neodstraňuje.',
  ),
  update: z.array(
    z.object({
      name: z.string().describe('Presný názov existujúcej položky'),
      qty: z.number().optional(),
      note: z.string().optional(),
      bag: z.enum(['osobna', 'kabinova', 'odbavena', 'naSebe']).optional(),
    }),
  ).describe('Zmeny existujúcich položiek (počet, poznámka, umiestnenie).'),
  changeSummary: z.array(z.string()).describe(
    'Krátke štítky zmien pre UI, napr. "+ Trekové palice", "− Druhá mikina", "Tričká 5 → 3". Prázdne, ak sa nič nemenilo.',
  ),
})

export type AiAssistantResult = z.infer<typeof AssistantSchema>

interface Body {
  cfg: TripConfig
  items: PackItem[]
  history: ChatMessage[]
  message: string
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const message = (body.message ?? '').trim()
    if (!message) return Response.json({ error: 'Missing message' }, { status: 400 })

    const history = (body.history ?? [])
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'POUŽÍVATEĽ' : 'TY'}: ${m.content}`)
      .join('\n')

    const prompt = `Si osobný asistent na balenie. Poznáš celú cestu aj aktuálny zoznam a vieš ho priamo upravovať.

${describeTrip(body.cfg)}

${describeList(body.items ?? [], body.cfg)}

${PACKING_PRINCIPLES}

${history ? `DOTERAJŠIA KONVERZÁCIA:\n${history}\n` : ''}
NOVÁ SPRÁVA OD POUŽÍVATEĽA:
"${message}"

Ako odpovedať:
• Ak používateľ žiada zmenu zoznamu ("pridaj…", "nechcem…", "menej tričiek", "beriem si aj dron"), vykonaj ju cez add/remove/update a v reply potvrď, čo si urobil.
• Ak sa pýta otázku ("zmestí sa mi to?", "čo si mám zobrať na ferratu?", "koľko to bude vážiť?"), odpovedz konkrétne s číslami z kontextu vyššie. Zoznam meň len ak to dáva zmysel.
• Ak pridávaš, vždy urči litre, gramy a batožinu — inak sa rozbije výpočet kapacity.
• Ak je batožina už plná, nepridávaj bez toho, aby si povedal, čo za to vypadne.
• Buď stručný a vecný. Žiadne zoznamy klišé. Po SLOVENSKY.`

    const result = await runStructured('ai-assistant', {
      schema: AssistantSchema,
      prompt,
      temperature: 0.5,
    })

    if (!result.ok) return failureResponse(result.failure)
    return Response.json(result.object)
  } catch (err) {
    console.error('[ai-assistant]', err)
    return Response.json({ error: 'Bad request', reason: 'other' }, { status: 500 })
  }
}
