import type { ActivityKind } from './types'

/**
 * Activity catalogue. Each activity is an independent driver of gear —
 * an active trip usually mixes several of them across its legs.
 * `icon` is a lucide-react export name, resolved in the UI.
 */
export const ACTIVITIES: {
  value: ActivityKind
  icon: string
  sk: string
  en: string
  /** Short hint shown under the chip */
  skHint: string
  enHint: string
}[] = [
  { value: 'hiking', icon: 'Mountain', sk: 'Turistika', en: 'Hiking', skHint: 'chodníky, výhľady', enHint: 'trails, viewpoints' },
  { value: 'city', icon: 'Building2', sk: 'Mesto', en: 'City', skHint: 'pamiatky, kaviarne', enHint: 'sights, cafés' },
  { value: 'beach', icon: 'Waves', sk: 'More a kúpanie', en: 'Beach & swim', skHint: 'pláž, bazén', enHint: 'beach, pool' },
  { value: 'boat', icon: 'Sailboat', sk: 'Lode a trajekty', en: 'Boats & ferries', skHint: 'výlety po vode', enHint: 'water trips' },
  { value: 'bike', icon: 'Bike', sk: 'Bicykel', en: 'Cycling', skHint: 'požičovňa, e-bike', enHint: 'rental, e-bike' },
  { value: 'running', icon: 'Footprints', sk: 'Beh', en: 'Running', skHint: 'ranné behy', enHint: 'morning runs' },
  { value: 'climbing', icon: 'Anchor', sk: 'Ferraty a lezenie', en: 'Via ferrata', skHint: 'istenie, prilba', enHint: 'harness, helmet' },
  { value: 'snow', icon: 'Snowflake', sk: 'Sneh a lyže', en: 'Snow & ski', skHint: 'zimné hory', enHint: 'winter mountains' },
  { value: 'nightlife', icon: 'Martini', sk: 'Večery a reštaurácie', en: 'Dining & nightlife', skHint: 'dress code', enHint: 'dress code' },
  { value: 'photo', icon: 'Camera', sk: 'Fotenie', en: 'Photography', skHint: 'východy, západy', enHint: 'sunrise, sunset' },
  { value: 'geocaching', icon: 'Compass', sk: 'Geocaching', en: 'Geocaching', skHint: 'kešky v okolí', enHint: 'caches nearby' },
  { value: 'roadtrip', icon: 'Car', sk: 'Roadtrip', en: 'Road trip', skHint: 'auto, presuny', enHint: 'car, transfers' },
  { value: 'wellness', icon: 'Sparkles', sk: 'Wellness', en: 'Wellness', skHint: 'sauna, kúpele', enHint: 'sauna, spa' },
  { value: 'work', icon: 'Laptop', sk: 'Práca na ceste', en: 'Work', skHint: 'notebook, hovory', enHint: 'laptop, calls' },
]

export const ACTIVITY_LABELS_SK: Record<ActivityKind, string> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.value, a.sk]),
) as Record<ActivityKind, string>

/** Elevation / coastline heuristics used to pre-suggest activities for a place. */
export function suggestActivities(elevation?: number): ActivityKind[] {
  if ((elevation ?? 0) >= 700) return ['hiking', 'photo']
  if ((elevation ?? 999) <= 30) return ['city', 'beach', 'hiking']
  return ['city', 'hiking']
}
