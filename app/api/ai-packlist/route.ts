import { generateObject } from 'ai'
import { gateway } from 'ai'
import { z } from 'zod'
import type { TripConfig } from '@/lib/types'

// Schema for AI-generated additions/modifications to the base packing list
const AiPacklistSchema = z.object({
  reasoning: z.string().describe(
    'Brief explanation of the main personalization decisions made (1-3 sentences, in Slovak)'
  ),
  additions: z.array(
    z.object({
      category: z.enum([
        'doklady', 'batazina', 'oblecenie', 'obuv', 'hygiena',
        'lekarnicka', 'elektronika', 'plaz', 'hory', 'mesto',
        'auto', 'geocaching', 'vylet', 'predodchodom',
      ]),
      name: z.string().describe('Item name in Slovak'),
      qty: z.number().optional().describe('Quantity, omit if not countable'),
      note: z.string().optional().describe('Optional short tip or explanation in Slovak'),
    })
  ).describe('New items to add on top of the base generated list'),
  removals: z.array(z.string()).describe(
    'Names of base-list items that should be removed as irrelevant for this specific trip'
  ),
  highlights: z.array(z.string()).describe(
    'Names of items (from base list or additions) that are especially important for this trip — shown with a star'
  ),
  weatherNote: z.string().optional().describe(
    'One-sentence personalised weather advice for packing, in Slovak'
  ),
})

export type AiPacklistResult = z.infer<typeof AiPacklistSchema>

function buildPrompt(cfg: TripConfig): string {
  const w = cfg.weather
  const days = cfg.startDate && cfg.endDate
    ? Math.max(1, Math.round((new Date(cfg.endDate).getTime() - new Date(cfg.startDate).getTime()) / 86400000) + 1)
    : 7

  const weatherDesc = w
    ? `Počasie v destinácii: avg max ${w.avgMax}°C, avg min ${w.avgMin}°C, ${w.rainyDays} daždivých dní z ${days}. ` +
      `Charakteristika: ${[w.hot && 'horúco', w.warm && 'teplo', w.cold && 'chladno', w.freezing && 'mrazivo', w.rainy && 'daždivo'].filter(Boolean).join(', ') || 'mierne'}.` +
      (w.isEstimate ? ' (predpoveď je odhad z historických dát)' : '')
    : 'Počasie nie je dostupné.'

  const destDesc = [
    cfg.destination.name,
    cfg.destination.admin1,
    cfg.destination.country,
  ].filter(Boolean).join(', ')

  const elevation = cfg.destination.elevation
    ? `Nadmorská výška: ${cfg.destination.elevation} m.`
    : ''

  const genderText = cfg.gender === 'zena' ? 'žena' : cfg.gender === 'muz' ? 'muž' : 'pohlavie neuvedené'
  const tripTypeText = cfg.tripTypes.length
    ? cfg.tripTypes.map(t => ({ more: 'more/pláž', hory: 'hory/turistika', mesto: 'mesto/kultúra' }[t])).join(' + ')
    : 'všeobecná dovolenka'

  const pieceLabels: Record<string, string> = {
    osobna: 'malý ruksak (osobná batožina pod sedadlo)',
    kabinova: 'kabínový kufrík',
    odbavena: 'odbavený kufor',
  }
  const luggageText = cfg.luggagePieces?.length
    ? cfg.luggagePieces.map((p) => pieceLabels[p] ?? p).join(' + ') +
      (cfg.luggagePieces.length === 1 && cfg.luggagePieces[0] === 'osobna' ? ' (VEĽMI obmedzený priestor!)' : '')
    : {
        'ruksak': 'len cestovný ruksak (obmedzený priestor!)',
        'ruksak+kabinka': 'malý batoh + kabínkový kufrík',
        'kufor-maly': 'malý kabínový kufrík',
        'kufor-velky': 'veľký kufrík v hold',
      }[cfg.luggageType]

  const extrasText = [
    cfg.carRental && 'požičané auto',
    cfg.geocaching && 'geocaching',
    cfg.optionalTrip && 'fakultatívny výlet',
  ].filter(Boolean).join(', ') || 'žiadne'

  const transportText = {
    lietadlo: 'letecky',
    auto: 'vlastným autom (žiadne váhové limity batožiny, ale povinná výbava auta, diaľničné známky, zelená karta)',
    vlak: 'vlakom (batožinu treba prenášať, cennosti pri sebe)',
    autobus: 'autobusom (batožinu treba prenášať, cennosti pri sebe)',
    ine: `iným spôsobom: ${cfg.transportOther || 'neupresnené'}`,
  }[cfg.transport ?? 'lietadlo']

  const accommodationText = {
    hotel: 'hotel/penzión (uteráky, sušič vlasov a základná hygiena sú k dispozícii)',
    privat: 'apartmán/privát (NIE SÚ uteráky, hygiena ani potraviny — treba si doniesť!)',
    kemp: 'kemping (treba kompletné vybavenie: stan, spacák, varič...)',
    ine: `iné: ${cfg.accommodationOther || 'neupresnené'}`,
  }[cfg.accommodation ?? 'hotel']

  const flightText = cfg.transport !== 'lietadlo'
    ? `Doprava: ${transportText}`
    : cfg.flightInfo
      ? `Doprava: letecky — ${cfg.flightInfo.airline} (${cfg.flightInfo.iata}), kabína: ${cfg.flightInfo.cabinBagSize}` +
        (cfg.flightInfo.cabinBagWeight ? `, max ${cfg.flightInfo.cabinBagWeight} kg` : '') +
        (cfg.hasPriority ? ', má priority boarding' : '') +
        (cfg.hasPaidBag ? ', zaplatená väčšia batožina' : '')
      : cfg.flightNumber
        ? `Doprava: letecky — číslo letu: ${cfg.flightNumber}`
        : 'Doprava: letecky (bez špecifík letu)'

  // Country info context
  const ci = cfg.countryInfo
  const countryContext = ci
    ? [
        `Mena: ${ci.currency} (${ci.currencySymbol}) — ${ci.cashTip}`,
        `Elektrina: ${ci.plugAdapter.type}, ${ci.plugAdapter.voltage}/${ci.plugAdapter.frequency}${ci.plugAdapter.needsAdapter ? ` — TREBA REDUKCIU: ${ci.plugAdapter.adapterNote}` : ' — redukcia nie je potrebná'}`,
        `Víza/vstup: ${ci.visaNote}`,
        ci.safetyNote ? `Bezpečnosť: ${ci.safetyNote}` : '',
        ci.healthTips?.length ? `Zdravie: ${ci.healthTips.join('; ')}` : '',
        ci.localTips?.length ? `Miestne tipy: ${ci.localTips.join('; ')}` : '',
        ci.baggageInfo?.airline
          ? `AI batožina (${ci.baggageInfo.airline}): kabína ${ci.baggageInfo.cabinSize ?? '?'}${ci.baggageInfo.cabinWeightKg ? `, max ${ci.baggageInfo.cabinWeightKg} kg` : ''}${ci.baggageInfo.checkedWeightKg ? `, odbavená max ${ci.baggageInfo.checkedWeightKg} kg` : ''}`
          : '',
      ].filter(Boolean).join('\n- ')
    : 'Nie sú dostupné.'

  return `Si expert na cestovanie a personalizované packing listy. Dostaneš základnú štruktúru packlistu a musíš navrhnúť DOPLNKY a ÚPRAVY, aby bol list čo najlepšie prispôsobený tejto konkrétnej ceste.

INFORMÁCIE O CESTE:
- Destinácia: ${destDesc}
- ${elevation}
- Dátum: ${cfg.startDate} → ${cfg.endDate} (${days} dní)
- ${cfg.startTime ? `Odchod o ${cfg.startTime}` : ''}${cfg.endTime ? `, návrat o ${cfg.endTime}` : ''}
- Cestovateľ: ${genderText}
- Typ cesty: ${tripTypeText}
- ${weatherDesc}
- ${flightText}
${cfg.transport === 'lietadlo' ? `- Batožina: ${luggageText}` : ''}
- Ubytovanie: ${accommodationText}
- Extras: ${extrasText}

KRAJINOVÉ INFORMÁCIE (zistené AI):
- ${countryContext}

POKYNY:
1. V "additions" navrhni konkrétne položky, ktoré základný zoznam vynechal. Zvaž:
   - Ak TREBA REDUKCIU (podľa krajinových info): pridaj "Cestovná redukcia do zásuvky (Typ X)" do kategórie "elektronika"
   - Ak mena NIE JE euro a karty nemusia fungovať: pridaj "Hotovosť v [mene]" do kategórie "doklady"
   - Zdravotné odporúčania: ak sú uvedené vakcíny, pridaj "Potvrdenie o očkovaní" alebo príslušné lieky
   - Lokálne kultúrne požiadavky: dress code, špeciálne povolenia, zálohy
   - Špecifiká destinácie, terén, sezóna, aktivity
   - Ak LEN osobná batožina (malý ruksak bez kabínovej/odbavenej): maximálna efektívnosť, odľahčenie, minimalizmus
   - DOPRAVA: ak ide autom — povinná výbava, prestávky, občerstvenie; ak vlakom/autobusom — zabezpečenie batožiny; NIKDY nespomínaj letecké limity ak sa neletí
   - BATOŽINOVÉ LIMITY AEROLÍNIE: ak sú uvedené konkrétne rozmery/váhy (z čísla letu alebo AI batožiny), AKTÍVNE s nimi pracuj — prispôsob množstvo oblečenia objemu batožiny, navrhni vyhodenie objemných položiek pri malej batožine, pri prísnych limitoch (napr. Ryanair/Wizz 10 kg) upozorni na váženie
   - UBYTOVANIE: privát/apartmán = doniesť uteráky, hygienu, základné potraviny; kemp = kompletné vybavenie; hotel = netreba uteráky ani sušič
2. V "removals" označ položky zbytočné pre túto konkrétnu cestu (napr. letecké položky ak sa neletí, uteráky ak je hotel).
3. V "highlights" vyber 3-6 KĽÚČOVÝCH položiek (pas, redukcia ak treba, lieky, SPF, atď.).
4. Buď konkrétny a relevantný — kvalita nad kvantitou.
5. Všetky texty píš po SLOVENSKY.`
}

export async function POST(req: Request) {
  try {
    const cfg: TripConfig = await req.json()

    const { object } = await generateObject({
      model: gateway('anthropic/claude-sonnet-5'),
      schema: AiPacklistSchema,
      prompt: buildPrompt(cfg),
      temperature: 0.4,
    })

    return Response.json(object)
  } catch (err) {
    console.error('[ai-packlist]', err)
    return Response.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
