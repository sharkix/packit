import type { Translations } from './i18n'

export type AiErrorReason = 'credits' | 'ratelimit' | 'config' | 'other'

/**
 * Reads the reason off a failed AI response so the UI can say what actually
 * went wrong. "Try again" is only honest for a transient failure — a billing
 * block needs a different message and a different action from the user.
 */
export async function readAiError(res: Response): Promise<AiErrorReason> {
  try {
    const body = await res.json()
    const reason = body?.reason
    if (reason === 'credits' || reason === 'ratelimit' || reason === 'config') return reason
  } catch {
    /* non-JSON body — fall through to the generic reason */
  }
  if (res.status === 402) return 'credits'
  if (res.status === 429) return 'ratelimit'
  return 'other'
}

export function aiErrorMessage(reason: AiErrorReason | null, t: Translations): string {
  switch (reason) {
    case 'credits': return t.aiErrorCredits
    case 'ratelimit': return t.aiErrorRateLimit
    case 'config': return t.aiErrorConfig
    default: return t.aiError
  }
}
