import { gateway, generateObject } from 'ai'
import { z } from 'zod'
import { describeTrip } from '@/lib/ai-context'
import type { TripConfig } from '@/lib/types'

export const maxDuration = 60

const ItinerarySchema = z.object({
  title: z.string().describe('Krátky výstižný názov cesty po slovensky, napr. "Dolomity na ľahko"'),
  days: z.array(
    z.object({
      date: z.string().describe('Dátum v tvare YYYY-MM-DD'),
      legId: z.string().describe('ID zastávky, ku ktorej deň patrí'),
      title: z.string().describe('Nadpis dňa po slovensky, napr. "Presun do Amalfi + večerná prechádzka"'),
      summary: z.string().describe('1–2 vety po slovensky o pláne dňa'),
      outfit: z.string().describe(
        'Čo si v ten deň obliecť, konkrétne podľa teplôt daného dňa — napr. "merino tričko + fleece ráno, shell do batohu".',
      ),
      dayBag: z.array(z.string()).describe('3–6 vecí, ktoré si v ten deň dať do denného batoha'),
      watchOut: z.string().optional().describe('Na čo si v ten deň dať pozor (počasie, presun, otváracie hodiny)'),
      intensity: z.enum(['oddych', 'stredna', 'narocna']).describe('Náročnosť dňa'),
    }),
  ),
  packingImplications: z.array(z.string()).describe(
    'Po slovensky, 3–5 viet: čo z tohto programu vyplýva pre balenie (napr. "dva dni v rade na chodníku = dva páry turistických ponožiek navyše").',
  ),
})

export type AiItineraryResult = z.infer<typeof ItinerarySchema>

export async function POST(req: Request) {
  try {
    const cfg: TripConfig = await req.json()
    const legs = cfg?.legs?.filter((l) => l.destination && l.startDate && l.endDate) ?? []
    if (!legs.length) return Response.json({ error: 'Missing legs' }, { status: 400 })

    const dayLines = legs.flatMap((l) => {
      const out: string[] = []
      const start = new Date(l.startDate + 'T00:00:00')
      const end = new Date(l.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10)
        const w = l.weather?.days.find((x) => x.date === iso)
        out.push(
          `  ${iso} · ${l.id} · ${l.destination?.name}${w ? ` · ${Math.round(w.tMin)}–${Math.round(w.tMax)} °C, dážď ${w.precipProb} %` : ''}`,
        )
      }
      return out
    })

    const { object } = await generateObject({
      model: gateway('anthropic/claude-sonnet-5'),
      schema: ItinerarySchema,
      temperature: 0.6,
      prompt: `Si skúsený cestovateľ, ktorý plánuje aktívne výlety. Navrhni realistický plán deň po dni.

${describeTrip(cfg)}

DNI, KTORÉ MUSÍŠ POKRYŤ (presne tieto dátumy, v tomto poradí):
${dayLines.join('\n')}

PRAVIDLÁ:
• Pre KAŽDÝ dátum zo zoznamu vyššie vytvor práve jeden záznam s presne tým istým dátumom a legId.
• Rešpektuj tempo cesty. Po náročnom dni nasaď ľahší. Deň presunu medzi zastávkami nie je zároveň deň na celodennú túru.
• Plán opri o reálne miesta a aktivity v danej destinácii, nie o všeobecné frázy.
• "outfit" prispôsob teplotám daného dňa — ráno býva o 8–10 °C chladnejšie ako popoludnie.
• Ak je v predpovedi dážď, presuň náročné aktivity na iný deň a napíš to do watchOut.
• Všetko po SLOVENSKY.`,
    })

    return Response.json(object)
  } catch (err) {
    console.error('[ai-itinerary]', err)
    return Response.json({ error: 'AI itinerary failed' }, { status: 500 })
  }
}
